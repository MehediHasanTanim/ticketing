import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Client } from 'pg';
import { start, type Harness } from './harness';
import { hashCredential } from '../adapters/src/crypto/credential';
import { closeControlPool } from '../adapters/src/postgres/control-plane-pool';
import { resetLimiter } from '../edge/src/rate-limit';
import { ulid } from '../core/src/ids';
import { ROLE_PERMISSIONS } from '../core/src/staff/roles';

/**
 * Story 1.4 at the boundary.
 *
 * The PRD says this is not a form and the story repeats it: the two guards are why.
 * So the assertions here are the refusals - a shipped role edited, a dependency
 * missing, a permission the caller does not hold, another Tenant's role - and each one
 * is made through a DIRECT API CALL with a crafted payload rather than through an
 * absent control, because the absent control is a courtesy and the server is the
 * control (AD-11).
 */

const admin = async (): Promise<Client> => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await c.connect();
  return c;
};

const OPERATOR_PASSWORD = 'test-operator-credential-not-a-real-one';
const ADMIN_PASSWORD = 'a-tenant-administrator-password';
const json = { 'content-type': 'application/json' };
const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}`, ...json });

interface Tenant { tenantId: string; token: string; staffMemberId: string; email: string }

describe('defining and duplicating roles', () => {
  let h: Harness;
  let a: Tenant;
  let b: Tenant;
  let harbour: string;
  let suffix = 0;
  const key = (stem: string): string => `${stem}_${(suffix += 1)}`;

  const drainOutbox = async (kind: string, email: string): Promise<string> => {
    const c = await admin();
    try {
      const res = await c.query<{ payload: { token: string } }>(
        `SELECT payload FROM control_plane.outbox
          WHERE kind = $1 AND payload->>'email' = $2 ORDER BY id DESC LIMIT 1`, [kind, email]);
      const token = res.rows[0]?.payload?.token;
      if (!token) throw new Error(`no ${kind} queued for ${email}`);
      return token;
    } finally { await c.end(); }
  };

  const provision = async (operatorToken: string, name: string): Promise<Tenant> => {
    const email = `role-admin-${ulid(new Date()).toLowerCase()}@hotel.test`;
    const res = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: bearer(operatorToken),
      body: JSON.stringify({ name, firstAdministratorEmail: email }),
    });
    expect(res.status, await res.clone().text()).toBe(201);
    const created = await res.json() as { tenantId: string };
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('tenant_administrator_invitation', email),
        password: ADMIN_PASSWORD, name: `${name} administrator`, languageTag: 'en',
      }),
    });
    expect(setUp.status, await setUp.clone().text()).toBe(200);
    const session = await setUp.json() as { accessToken: string; session: { staffMemberId: string } };
    return { tenantId: created.tenantId, token: session.accessToken, staffMemberId: session.session.staffMemberId, email };
  };

  beforeAll(async () => {
    resetLimiter();
    h = await start();
    const operatorId = `01O${ulid(new Date()).slice(3)}`;
    const c = await admin();
    try {
      const { hash, salt } = hashCredential(OPERATOR_PASSWORD);
      await c.query(
        `INSERT INTO control_plane.operator_accounts
           (id, email, display_name, scopes, credential_hash, credential_salt, active)
         VALUES ($1, $2, 'Story 1.4 suite operator', $3, $4, $5, true)`,
        [operatorId, `${operatorId.toLowerCase()}@jazzware.test`, ['provision:tenant'], hash, salt]);
    } finally { await c.end(); }
    const signIn = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ email: `${operatorId.toLowerCase()}@jazzware.test`, password: OPERATOR_PASSWORD }),
    });
    const operatorToken = (await signIn.json() as { token: { accessToken: string } }).token.accessToken;

    a = await provision(operatorToken, 'Story 1.4 Tenant A');
    b = await provision(operatorToken, 'Story 1.4 Tenant B');

    const created = await fetch(`${h.base}/v1/properties`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({ name: 'The Harbour', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
    });
    harbour = (await created.json() as { propertyId: string }).propertyId;
  });

  afterAll(async () => { await h?.stop(); await closeControlPool(); });
  beforeEach(() => { resetLimiter(); });

  const duplicate = async (token: string, source: string, body: unknown): Promise<Response> =>
    fetch(`${h.base}/v1/roles/${source}/duplicate`, {
      method: 'POST', headers: bearer(token), body: JSON.stringify(body),
    });
  const patch = async (token: string, roleKey: string, body: unknown): Promise<Response> =>
    fetch(`${h.base}/v1/roles/${roleKey}`, {
      method: 'PATCH', headers: bearer(token), body: JSON.stringify(body),
    });

  // ------------------------------------------------------------------------ AC-1

  it('serves the dependency graph as data, so one definition drives both sides', async () => {
    const res = await fetch(`${h.base}/v1/permissions`, { headers: bearer(a.token) });
    expect(res.status).toBe(200);
    const catalogue = await res.json() as Array<{ key: string; class: string; minimumScope: string; dependsOn: string[] }>;
    expect(catalogue.length).toBeGreaterThan(0);
    // The specific edges the guards below rely on. If the graph is served empty, every
    // dependency test in this file would pass while proving nothing.
    const invite = catalogue.find((c) => c.key === 'staff.invite');
    expect(invite?.dependsOn.sort()).toEqual(['role.read', 'staff.read']);
    expect(catalogue.find((c) => c.key === 'role.define')?.minimumScope).toBe('tenant');
    expect(catalogue.find((c) => c.key === 'property.read')?.class).toBe('operational');
  });

  it('shows shipped roles as duplicable and NOT editable, each with its own set', async () => {
    const roles = await (await fetch(`${h.base}/v1/roles`, { headers: bearer(a.token) })).json() as
      Array<{ key: string; isShipped: boolean; editable: boolean; permissions: string[]; independentOfSource: boolean }>;
    expect(roles.length).toBeGreaterThanOrEqual(7);
    expect(roles.every((r) => r.isShipped && !r.editable)).toBe(true);
    // Seeded from core/src/staff/roles.ts at provisioning - the same sets migration 009
    // backfilled into Tenants that already existed.
    for (const role of roles) {
      expect(role.permissions.sort(), role.key)
        .toEqual([...(ROLE_PERMISSIONS[role.key] ?? [])].sort());
    }
    // Stated in every representation, so no client has to remember the rule (AC-1).
    expect(roles.every((r) => r.independentOfSource === true)).toBe(true);
  });

  it('REFUSES editing a shipped role, through the API and at the database', async () => {
    const res = await patch(a.token, 'line_staff', { name: 'Renamed' });
    expect(res.status).toBe(409);
    expect((await res.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/duplicable and never editable/);

    // And for every connection, including an administrative one - because a rule
    // stated only in a route is a rule the next route forgets.
    const c = await admin();
    try {
      await expect(c.query(
        `UPDATE control_plane.roles SET name = 'Tampered' WHERE tenant_id = $1 AND key = 'line_staff'`,
        [a.tenantId])).rejects.toThrow(/duplicable, never editable/);
      await expect(c.query(
        `DELETE FROM control_plane.roles WHERE tenant_id = $1 AND key = 'line_staff'`,
        [a.tenantId])).rejects.toThrow(/never deleted/);
    } finally { await c.end(); }
  });

  it('duplicates a shipped role into an INDEPENDENT copy, and records where it came from', async () => {
    const roleKey = key('night_auditor');
    const res = await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Night auditor' });
    expect(res.status, await res.clone().text()).toBe(201);
    const role = await res.json() as {
      key: string; isShipped: boolean; editable: boolean; permissions: string[];
      duplicatedFrom: string; independentOfSource: boolean;
    };
    expect(role.isShipped).toBe(false);
    expect(role.editable).toBe(true);
    expect(role.duplicatedFrom).toBe('line_staff');
    expect(role.permissions).toEqual(['property.read']);
    expect(role.independentOfSource).toBe(true);

    // A second copy of the same key is a conflict, not a silent overwrite.
    expect((await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Again' })).status).toBe(409);
  });

  it('keeps a duplicate independent when its SOURCE later changes (T3)', async () => {
    // Shipped roles cannot change, so the only way to test propagation is a chain of
    // two custom roles - which is also the case a hotel will actually hit.
    const source = key('source_role');
    const copy = key('copy_role');
    expect((await duplicate(a.token, 'line_staff', { key: source, name: 'Source' })).status).toBe(201);
    expect((await duplicate(a.token, source, { key: copy, name: 'Copy' })).status).toBe(201);

    // Change the SOURCE.
    const changed = await patch(a.token, source, { permissions: ['property.read', 'staff.read'] });
    expect(changed.status, await changed.clone().text()).toBe(200);

    // The copy is untouched: independent at creation, BY VALUE - deliberately unlike
    // Property settings, which inherit by reference (AD-9, Story 1.2).
    const roles = await (await fetch(`${h.base}/v1/roles`, { headers: bearer(a.token) })).json() as
      Array<{ key: string; permissions: string[] }>;
    expect(roles.find((r) => r.key === copy)?.permissions).toEqual(['property.read']);
    expect(roles.find((r) => r.key === source)?.permissions).toEqual(['property.read', 'staff.read']);
  });

  // ------------------------------------------------------------------------ AC-2

  it('refuses a permission whose dependency is absent, and NAMES the dependency', async () => {
    const roleKey = key('inviter');
    expect((await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Inviter' })).status).toBe(201);

    // staff.invite needs staff.read AND role.read. Enabling it alone is refused.
    const res = await patch(a.token, roleKey, { permissions: ['property.read', 'staff.invite'] });
    expect(res.status).toBe(400);
    const body = await res.json() as {
      code: string; details?: { unmet?: Array<{ permission: string; requires: string }>; reason?: string };
    };
    expect(body.code).toBe('validation_failed');
    // AC-2: the interface must name "the specific dependency that must be enabled
    // first", which it cannot do unless the server says which one.
    expect(body.details?.unmet).toContainEqual({ permission: 'staff.invite', requires: 'staff.read' });
    expect(body.details?.unmet).toContainEqual({ permission: 'staff.invite', requires: 'role.read' });

    // With both dependencies present it saves.
    const ok = await patch(a.token, roleKey, {
      permissions: ['property.read', 'staff.read', 'role.read', 'staff.invite'],
    });
    expect(ok.status, await ok.clone().text()).toBe(200);
    expect((await ok.json() as { permissions: string[] }).permissions)
      .toEqual(['property.read', 'role.read', 'staff.invite', 'staff.read']);
  });

  it('refuses a permission nobody implements, rather than storing a word', async () => {
    const roleKey = key('inventive');
    await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Inventive' });
    const res = await patch(a.token, roleKey, { permissions: ['property.read', 'jobs.delete_everything'] });
    expect(res.status).toBe(400);
    expect((await res.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/not a permission this system has/);
  });

  // ------------------------------------------------------------------------ AC-3

  it('refuses a CRAFTED request granting a permission the caller does not hold', async () => {
    // A limited administrator: enough to define roles, and nothing else worth having.
    const limitedRole = key('role_editor');
    expect((await duplicate(a.token, 'property_administrator', {
      key: limitedRole, name: 'Role editor',
      permissions: ['property.read', 'role.read', 'role.define'],
      assignableAtTenantScope: true,
    })).status).toBe(201);

    const email = `limited-${Date.now()}@hotel.test`;
    const invited = await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({
        name: 'Limited administrator', languageTag: 'en', email,
        roles: [{ roleKey: limitedRole }],
      }),
    });
    expect(invited.status, await invited.clone().text()).toBe(201);
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'limited-administrator-pw', name: 'Limited administrator', languageTag: 'en',
      }),
    });
    expect(setUp.status, await setUp.clone().text()).toBe(200);
    const limited = (await setUp.json() as { accessToken: string }).accessToken;

    // They can define a role out of what they hold...
    const own = key('own_copy');
    expect((await duplicate(limited, limitedRole, { key: own, name: 'Own copy' })).status).toBe(201);

    // ...and they cannot grant themselves more, on either operation.
    const escalated = await patch(limited, own, {
      permissions: ['property.read', 'role.read', 'role.define', 'staff.read'],
    });
    expect(escalated.status).toBe(403);
    const body = await escalated.json() as { code: string; details?: { permission?: string; reason?: string } };
    expect(body.code).toBe('forbidden');
    // Named, because "you may not do that" with no subject is a refusal nobody can act on.
    expect(body.details?.permission).toBe('staff.read');

    // DUPLICATION is not a way around it: copying the property administrator would
    // otherwise mint a role holding everything they lack.
    const viaCopy = await duplicate(limited, 'property_administrator', { key: key('sneaky'), name: 'Sneaky' });
    expect(viaCopy.status).toBe(403);
    expect((await viaCopy.json() as { details?: { permission?: string } }).details?.permission).toBeTruthy();

    // And a line-staff credential cannot reach the editor at all.
    const lineEmail = `line-role-${Date.now()}@hotel.test`;
    await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({
        name: 'Line staff', languageTag: 'en', email: lineEmail,
        roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
      }),
    });
    const lineSetUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', lineEmail),
        password: 'line-staff-role-pw12', name: 'Line staff', languageTag: 'en',
      }),
    });
    const lineToken = (await lineSetUp.json() as { accessToken: string }).accessToken;
    expect((await duplicate(lineToken, 'line_staff', { key: key('nope'), name: 'Nope' })).status).toBe(403);
    expect((await fetch(`${h.base}/v1/permissions`, { headers: bearer(lineToken) })).status).toBe(403);
  });

  it('refuses a role that carries an authority it could never exercise', async () => {
    const roleKey = key('incoherent');
    await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Incoherent' });
    // property.create is only ever conferred by a Tenant-wide grant, so a role that is
    // not assignable Tenant-wide would carry it inertly - and an inert permission in a
    // role editor reads as a capability.
    const res = await patch(a.token, roleKey, { permissions: ['property.read', 'property.create'] });
    expect(res.status).toBe(400);
    expect((await res.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/assignable Tenant-wide/);
    expect((await patch(a.token, roleKey, {
      permissions: ['property.read', 'property.create'], assignableAtTenantScope: true,
    })).status).toBe(200);
  });

  // ------------------------------------------------------------------------ AC-4

  it('records the actor, the timestamp and the PREVIOUS VALUE (FR-6)', async () => {
    const roleKey = key('audited');
    expect((await duplicate(a.token, 'line_staff', {
      key: roleKey, name: 'Audited', recoveryApprovalThreshold: 2500,
    })).status).toBe(201);
    expect((await patch(a.token, roleKey, {
      name: 'Audited role', permissions: ['property.read', 'staff.read'],
    })).status).toBe(200);

    const c = await admin();
    try {
      const audit = await c.query<{ actor: string; actor_kind: string; action: string; details: Record<string, unknown>; occurred_at: Date }>(
        `SELECT actor, actor_kind, action, details, occurred_at FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND details->>'roleKey' = $2 ORDER BY id`, [a.tenantId, roleKey]);
      expect(audit.rows.map((r) => r.action)).toEqual(['role.duplicated', 'role.changed']);
      expect(audit.rows.every((r) => r.actor === a.staffMemberId && r.actor_kind === 'staff_member')).toBe(true);
      expect(audit.rows.every((r) => r.occurred_at instanceof Date)).toBe(true);

      // A duplication has no previous value for the role it creates, so it records
      // what it was copied FROM - the question anybody reading this later is asking.
      expect(audit.rows[0]!.details.before).toBeNull();
      expect(audit.rows[0]!.details.duplicatedFrom).toBe('line_staff');

      // And a change records the previous value, read rather than reconstructed.
      const change = audit.rows[1]!.details as {
        changed: string[]; before: { name: string; permissions: string[] }; after: { name: string; permissions: string[] };
      };
      expect(change.changed.sort()).toEqual(['name', 'permissions']);
      expect(change.before.name).toBe('Audited');
      expect(change.before.permissions).toEqual(['property.read']);
      expect(change.after.permissions).toEqual(['property.read', 'staff.read']);

      // Both events named no Property - AD-3's exception, extended on purpose.
      const events = await c.query<{ type: string; property_id: string | null }>(
        `SELECT type, property_id FROM control_plane.events
          WHERE tenant_id = $1 AND payload->>'roleKey' = $2 ORDER BY seq`, [a.tenantId, roleKey]);
      expect(events.rows.map((r) => r.type)).toEqual(['RoleDuplicated', 'RoleChanged']);
      expect(events.rows.every((r) => r.property_id === null)).toBe(true);

      // FR-43: stored, and nothing routed.
      const stored = await c.query<{ recovery_approval_threshold: number }>(
        'SELECT recovery_approval_threshold FROM control_plane.roles WHERE tenant_id = $1 AND key = $2',
        [a.tenantId, roleKey]);
      expect(stored.rows[0]?.recovery_approval_threshold).toBe(2500);
    } finally { await c.end(); }
  });

  it('writes no audit entry for an edit that changes nothing', async () => {
    const roleKey = key('unchanged');
    await duplicate(a.token, 'line_staff', { key: roleKey, name: 'Unchanged' });
    expect((await patch(a.token, roleKey, { permissions: ['property.read'] })).status).toBe(200);
    const c = await admin();
    try {
      const audit = await c.query(
        `SELECT 1 FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND details->>'roleKey' = $2 AND action = 'role.changed'`,
        [a.tenantId, roleKey]);
      // An audit trail that records changes which did not happen is one nobody can
      // read for the ones that did.
      expect(audit.rowCount).toBe(0);
    } finally { await c.end(); }
  });

  // -------------------------------------------------------------- the 1.3 seam, FR-1

  it('makes a CUSTOM role real: assignable, and resolved from the Tenant not the build', async () => {
    // The seam Story 1.3 left open in as many words. If permission resolution still
    // read a constant, this staff member would hold nothing.
    const roleKey = key('night_manager');
    expect((await duplicate(a.token, 'line_staff', {
      key: roleKey, name: 'Night manager', permissions: ['property.read', 'staff.read'],
    })).status).toBe(201);

    const email = `night-${Date.now()}@hotel.test`;
    expect((await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({
        name: 'Night manager', languageTag: 'en', email,
        roles: [{ propertyId: harbour, roleKey }],
      }),
    })).status).toBe(201);
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'night-manager-pw-12', name: 'Night manager', languageTag: 'en',
      }),
    });
    const token = (await setUp.json() as { accessToken: string }).accessToken;
    const session = await (await fetch(`${h.base}/v1/auth/session`, { headers: bearer(token) })).json() as
      { permissions: string[] };
    expect(session.permissions).toEqual(['property.read', 'staff.read']);
    // And the server honours it: staff.read works, staff.invite does not.
    expect((await fetch(`${h.base}/v1/staff`, { headers: bearer(token) })).status).toBe(200);
    expect((await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(token),
      body: JSON.stringify({ name: 'x', languageTag: 'en', roles: [{ propertyId: harbour, roleKey: 'line_staff' }] }),
    })).status).toBe(403);
  });

  it('lets a custom role be held TENANT-WIDE when the role says so', async () => {
    // The defect this covers: Story 1.3 checked a hard-coded list of the two shipped
    // roles that may be held Tenant-wide, which a custom role could never join.
    const roleKey = key('group_auditor');
    expect((await duplicate(a.token, 'corporate_viewer', {
      key: roleKey, name: 'Group auditor', assignableAtTenantScope: true,
    })).status).toBe(201);
    const email = `group-${Date.now()}@hotel.test`;
    const invited = await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({ name: 'Group auditor', languageTag: 'en', email, roles: [{ roleKey }] }),
    });
    expect(invited.status, await invited.clone().text()).toBe(201);
    expect((await invited.json() as { staffMember: { roles: Array<{ propertyId?: string }> } })
      .staffMember.roles[0]?.propertyId).toBeUndefined();
  });

  it('keeps one Tenant\'s roles entirely out of another\'s reach (FR-1)', async () => {
    const roleKey = key('a_only');
    expect((await duplicate(a.token, 'line_staff', { key: roleKey, name: 'A only' })).status).toBe(201);
    // not_found, never forbidden: the response must not confirm that it exists.
    expect((await patch(b.token, roleKey, { name: 'Stolen' })).status).toBe(404);
    expect((await duplicate(b.token, roleKey, { key: key('theirs'), name: 'Theirs' })).status).toBe(404);
    const theirs = await (await fetch(`${h.base}/v1/roles`, { headers: bearer(b.token) })).json() as
      Array<{ key: string }>;
    expect(theirs.some((r) => r.key === roleKey)).toBe(false);
    // And the same key is free in the other Tenant, because roles are per Tenant.
    expect((await duplicate(b.token, 'line_staff', { key: roleKey, name: 'Same name, other Tenant' })).status)
      .toBe(201);
  });

  it('refuses an unauthenticated caller on every write', async () => {
    for (const [method, path] of [['POST', '/v1/roles/line_staff/duplicate'], ['PATCH', '/v1/roles/line_staff']] as const) {
      const res = await fetch(`${h.base}${path}`, { method, headers: json, body: '{}' });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
});
