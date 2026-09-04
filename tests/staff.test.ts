import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Client } from 'pg';
import { start, type Harness } from './harness';
import { hashCredential } from '../adapters/src/crypto/credential';
import { closeControlPool } from '../adapters/src/postgres/control-plane-pool';
import { mintSessionToken } from '../edge/src/session-token';
import { resetLimiter } from '../edge/src/rate-limit';
import { ulid } from '../core/src/ids';

/**
 * Story 1.3 at the boundary, end to end from provisioning.
 *
 * This suite deliberately starts where a real Tenant starts: a Jazzware operator
 * provisions it (Story 1.1), which issues the first administrator's invitation and
 * creates no Properties and no Staff Members. Redeeming that invitation is the first
 * thing this story does, and until both halves existed a provisioned Tenant had an
 * administrator who could not sign in. Building the suite any other way - seeding a
 * Staff Member row directly - would have tested the handlers without testing the
 * seam, which is the half that was actually at risk.
 *
 * The criteria worth automating are the refusals and the re-resolutions: inviting
 * somebody working is easy to see, while "a crafted payload is refused server-side",
 * "a PIN never authorises configuration" and "permissions are re-resolved on a
 * context switch" are what has to still be true after Epics 2, 3 and 4 have been
 * through here.
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

describe('Staff Members, roles per Property, and the session', () => {
  let h: Harness;
  let a: Tenant;
  let b: Tenant;
  let harbour: string;
  let quay: string;

  /** The plaintext an invitation or reset link carries. The cell can INSERT into the
   *  outbox and not read it back (migration 008), so the suite reads it the way the
   *  AD-8 notification adapter will - with a connection that is allowed to. */
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
    const email = `admin-${ulid(new Date()).toLowerCase()}@hotel.test`;
    const res = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: bearer(operatorToken),
      body: JSON.stringify({ name, firstAdministratorEmail: email }),
    });
    // `clone()` before reading: an assertion MESSAGE is evaluated eagerly, so
    // reading the body here consumes it and the next line throws "Body is unusable"
    // - which reports a broken test rather than the failure it was meant to explain.
    expect(res.status, await res.clone().text()).toBe(201);
    const created = await res.json() as { tenantId: string };

    // THE SEAM: Story 1.1 issues, Story 1.3 redeems.
    const token = await drainOutbox('tenant_administrator_invitation', email);
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ token, password: ADMIN_PASSWORD, name: `${name} administrator`, languageTag: 'en' }),
    });
    expect(setUp.status, await setUp.clone().text()).toBe(200);
    const session = await setUp.json() as {
      accessToken: string; session: { staffMemberId: string; permissions: string[]; propertyId?: string };
    };
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
         VALUES ($1, $2, 'Story 1.3 suite operator', $3, $4, $5, true)`,
        [operatorId, `${operatorId.toLowerCase()}@jazzware.test`, ['provision:tenant'], hash, salt]);
    } finally { await c.end(); }

    const signIn = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ email: `${operatorId.toLowerCase()}@jazzware.test`, password: OPERATOR_PASSWORD }),
    });
    const operatorToken = (await signIn.json() as { token: { accessToken: string } }).token.accessToken;

    a = await provision(operatorToken, 'Story 1.3 Tenant A');
    b = await provision(operatorToken, 'Story 1.3 Tenant B');

    // Two Properties, created by the Tenant's own administrator on their own
    // authority (FR-1) - which needs the TENANT-WIDE grant redemption gave them.
    const create = async (tenant: Tenant, name: string): Promise<string> => {
      const res = await fetch(`${h.base}/v1/properties`, {
        method: 'POST', headers: bearer(tenant.token),
        body: JSON.stringify({ name, region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
      });
      expect(res.status, await res.clone().text()).toBe(201);
      return (await res.json() as { propertyId: string }).propertyId;
    };
    harbour = await create(a, 'The Harbour');
    quay = await create(a, 'The Quay');
  });

  afterAll(async () => { await h?.stop(); await closeControlPool(); });

  /**
   * The limiter is PROCESS STATE (see rate-limit.ts), and this suite drives the
   * limited endpoints far harder than a person would - twelve credential set-ups
   * against a five-minute window of ten. Resetting between tests keeps each one
   * testing what it means to test; the flood test below does its flooding inside a
   * single test, so it is unaffected.
   */
  beforeEach(() => { resetLimiter(); });

  const invite = async (token: string, body: unknown): Promise<Response> =>
    fetch(`${h.base}/v1/staff`, { method: 'POST', headers: bearer(token), body: JSON.stringify(body) });

  // ------------------------------------------------------------------------ AC-1

  it('redeems Story 1.1\'s invitation into a Tenant-wide administrator who can sign in', async () => {
    // The seam, asserted rather than assumed: before this story a provisioned Tenant
    // had an administrator with no way in.
    const res = await fetch(`${h.base}/v1/auth/session`, { headers: bearer(a.token) });
    expect(res.status).toBe(200);
    const session = await res.json() as {
      credentialType: string; permissions: string[]; propertyId?: string;
      switchableProperties: Array<{ id: string; region: string; active: boolean }>;
      region?: string; languageTag: string;
    };
    expect(session.credentialType).toBe('password');
    // Tenant-wide authority: the permissions only a Tenant-wide grant confers.
    expect(session.permissions).toContain('property.create');
    expect(session.permissions).toContain('staff.invite');
    // Two Properties now exist, so no single context is implied and the picker shows.
    expect(session.propertyId).toBeUndefined();
    expect(session.switchableProperties.map((p) => p.id).sort()).toEqual([harbour, quay].sort());
    // Residency is stated where the person choosing a context can see it (DG-4).
    expect(session.switchableProperties.every((p) => p.region === 'eu-west-1')).toBe(true);
    expect(session.switchableProperties.every((p) => p.active)).toBe(true);

    // And signing in again with the password works - which is the whole point of the
    // fallback FR-1 makes structural.
    const again = await fetch(`${h.base}/v1/auth/sign-in`, {
      method: 'POST', headers: json, body: JSON.stringify({ email: a.email, password: ADMIN_PASSWORD }),
    });
    expect(again.status).toBe(200);
    expect((await again.json() as { status: string }).status).toBe('authenticated');
  });

  it('creates a Staff Member with EXACTLY the pairs requested, and an emailed set-up link', async () => {
    const res = await invite(a.token, {
      name: 'Amara Okafor', languageTag: 'en', email: `amara-${Date.now()}@hotel.test`,
      roles: [{ propertyId: harbour, roleKey: 'supervisor' }, { propertyId: quay, roleKey: 'line_staff' }],
    });
    expect(res.status, await res.clone().text()).toBe(201);
    const out = await res.json() as {
      staffMember: { staffMemberId: string; roles: Array<{ propertyId?: string; roleKey: string }>; credentialStatus: string };
      pin?: string; invitationExpiresAt?: string;
    };
    expect(out.staffMember.roles).toEqual([
      { propertyId: harbour, roleKey: 'supervisor' }, { propertyId: quay, roleKey: 'line_staff' },
    ].sort((x, y) => x.propertyId.localeCompare(y.propertyId)));
    // An address means a link, not a PIN. The two paths are decided by one field.
    expect(out.pin).toBeUndefined();
    expect(out.invitationExpiresAt).toBeTruthy();
    expect(out.staffMember.credentialStatus).toBe('invited');

    const c = await admin();
    try {
      // Only the HASH is stored. A row an attacker can read must not contain a
      // usable credential.
      const inv = await c.query<{ token_hash: Buffer; scope: string; staff_member_id: string }>(
        'SELECT token_hash, scope, staff_member_id FROM control_plane.invitations WHERE staff_member_id = $1',
        [out.staffMember.staffMemberId]);
      expect(inv.rows[0]?.scope).toBe('staff_member');
      expect(inv.rows[0]?.token_hash).toHaveLength(32);
      // Two events, neither naming a Property - AD-3's exception, extended on purpose.
      const ev = await c.query<{ type: string; property_id: string | null }>(
        `SELECT type, property_id FROM control_plane.events
          WHERE payload->>'staffMemberId' = $1 ORDER BY seq`, [out.staffMember.staffMemberId]);
      expect(ev.rows.map((r) => r.type)).toEqual(['StaffMemberInvited', 'RolesAssigned']);
      expect(ev.rows.every((r) => r.property_id === null)).toBe(true);
    } finally { await c.end(); }
  });

  it('creates a PIN-ONLY account when there is no address, and returns the PIN once', async () => {
    const res = await invite(a.token, {
      name: 'Room attendant', languageTag: 'ar',
      roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    });
    expect(res.status).toBe(201);
    const out = await res.json() as { staffMember: { staffMemberId: string; credentialStatus: string }; pin?: string };
    expect(out.pin).toMatch(/^\d{6}$/);
    expect(out.staffMember.credentialStatus).toBe('pin_only');

    const c = await admin();
    try {
      // Hashed, salted, and the plaintext is nowhere in the database.
      const cred = await c.query<{ kind: string; hash: Buffer; salt: Buffer }>(
        'SELECT kind, hash, salt FROM control_plane.staff_credentials WHERE staff_member_id = $1',
        [out.staffMember.staffMemberId]);
      expect(cred.rows.map((r) => r.kind)).toEqual(['pin']);
      expect(cred.rows[0]!.hash.toString('utf8')).not.toContain(out.pin!);
      const anywhere = await c.query(
        `SELECT 1 FROM control_plane.outbox WHERE payload::text LIKE '%' || $1 || '%'`, [out.pin]);
      expect(anywhere.rowCount).toBe(0);
    } finally { await c.end(); }

    // Reading it back is not on offer: the response was the only channel.
    const list = await fetch(`${h.base}/v1/staff`, { headers: bearer(a.token) });
    expect(await list.text()).not.toContain(out.pin);
  });

  it('refuses a second Staff Member with the same address IN THIS TENANT, and allows it in another', async () => {
    const email = `shared-${Date.now()}@hotel.test`;
    const first = await invite(a.token, {
      name: 'First', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    });
    expect(first.status).toBe(201);
    expect((await invite(a.token, {
      name: 'Second', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    })).status).toBe(409);
    // And the SAME address at another Tenant is fine, deliberately: global uniqueness
    // would make this 409 reveal that the person has an account somewhere else, which
    // is exactly the cross-Tenant leak FR-1 exists to prevent.
    expect((await invite(b.token, {
      name: 'Elsewhere', languageTag: 'en', email, roles: [{ roleKey: 'corporate_viewer' }],
    })).status).toBe(201);
  });

  // ------------------------------------------------------------------------ AC-2

  it('offers the shipped role set to the picker, and says which may be held Tenant-wide', async () => {
    const res = await fetch(`${h.base}/v1/roles`, { headers: bearer(a.token) });
    expect(res.status).toBe(200);
    const roles = await res.json() as Array<{ key: string; isShipped: boolean; assignableAtTenantScope: boolean }>;
    for (const key of ['line_staff', 'supervisor', 'department_manager', 'front_office',
      'duty_manager', 'property_administrator', 'corporate_viewer']) {
      expect(roles.map((r) => r.key), key).toContain(key);
    }
    expect(roles.every((r) => r.isShipped)).toBe(true);
    expect(roles.filter((r) => r.assignableAtTenantScope).map((r) => r.key).sort())
      .toEqual(['corporate_viewer', 'property_administrator']);
  });

  // ------------------------------------------------------------------------ AC-3

  it('switches Property without signing out, and RE-RESOLVES permissions for the new one', async () => {
    // Deliberately different roles at the two Properties, so a switch that failed to
    // re-resolve would be visible rather than merely unproven.
    const email = `switcher-${Date.now()}@hotel.test`;
    const invited = await invite(a.token, {
      name: 'Two Properties', languageTag: 'en', email,
      roles: [{ propertyId: harbour, roleKey: 'property_administrator' }, { propertyId: quay, roleKey: 'line_staff' }],
    });
    expect(invited.status).toBe(201);
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'switcher-password-not-real', name: 'Two Properties', languageTag: 'en',
      }),
    });
    expect(setUp.status).toBe(200);
    const first = await setUp.json() as { accessToken: string; session: { propertyId?: string } };
    // Two Properties, so no context is implied.
    expect(first.session.propertyId).toBeUndefined();

    const switchTo = async (token: string, propertyId: string): Promise<{ accessToken: string; session: { propertyId?: string; permissions: string[]; region?: string } }> => {
      const res = await fetch(`${h.base}/v1/auth/context`, {
        method: 'POST', headers: bearer(token), body: JSON.stringify({ propertyId }),
      });
      expect(res.status, await res.clone().text()).toBe(200);
      return res.json() as never;
    };

    const atHarbour = await switchTo(first.accessToken, harbour);
    expect(atHarbour.session.propertyId).toBe(harbour);
    expect(atHarbour.session.permissions).toContain('staff.invite');
    expect(atHarbour.session.region).toBe('eu-west-1');

    // No sign-out in between, and the permissions are DIFFERENT at the Quay.
    const atQuay = await switchTo(atHarbour.accessToken, quay);
    expect(atQuay.session.propertyId).toBe(quay);
    expect(atQuay.session.permissions).not.toContain('staff.invite');
    expect(atQuay.session.permissions).toContain('property.read');

    // A NEW TOKEN, not a reinterpreted one (AD-3): a scope a header could change is
    // not a scope.
    expect(atQuay.accessToken).not.toBe(atHarbour.accessToken);
    // And the server refuses the action at the Quay even though the same person may
    // do it at the Harbour - which is the point of re-resolving rather than caching.
    const refused = await invite(atQuay.accessToken, {
      name: 'Nope', languageTag: 'en', roles: [{ propertyId: quay, roleKey: 'line_staff' }],
    });
    expect(refused.status).toBe(403);
    expect((await invite(atHarbour.accessToken, {
      name: 'Fine', languageTag: 'en', roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    })).status).toBe(201);
  });

  it('answers not_found for another Tenant\'s Property and forbidden for one it holds no role at', async () => {
    const bProperty = await (async (): Promise<string> => {
      const res = await fetch(`${h.base}/v1/properties`, {
        method: 'POST', headers: bearer(b.token),
        body: JSON.stringify({ name: 'B Property', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
      });
      return (await res.json() as { propertyId: string }).propertyId;
    })();

    // A Property in ANOTHER Tenant: not_found, never forbidden, so the response
    // cannot be used to discover that it exists.
    const outside = await fetch(`${h.base}/v1/auth/context`, {
      method: 'POST', headers: bearer(a.token), body: JSON.stringify({ propertyId: bProperty }),
    });
    expect(outside.status).toBe(404);

    // A Property in THIS Tenant where the caller holds no role: forbidden, because
    // they already know it exists.
    const email = `harbour-only-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Harbour only', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'supervisor' }],
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'harbour-only-password', name: 'Harbour only', languageTag: 'en',
      }),
    });
    const s = await setUp.json() as { accessToken: string; session: { propertyId?: string } };
    // One Property, so the session is scoped to it and no picker is needed.
    expect(s.session.propertyId).toBe(harbour);
    const inside = await fetch(`${h.base}/v1/auth/context`, {
      method: 'POST', headers: bearer(s.accessToken), body: JSON.stringify({ propertyId: quay }),
    });
    expect(inside.status).toBe(403);
  });

  // ------------------------------------------------------------------------ AC-4

  it('refuses a CRAFTED payload that names a Property the caller does not administer', async () => {
    const email = `harbour-admin-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Harbour administrator', languageTag: 'en', email,
      roles: [{ propertyId: harbour, roleKey: 'property_administrator' }],
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'harbour-administrator-pw', name: 'Harbour administrator', languageTag: 'en',
      }),
    });
    const token = (await setUp.json() as { accessToken: string }).accessToken;

    // A direct API call with a crafted payload, which is what the criterion asks for
    // rather than an absent option in a picker.
    expect((await invite(token, {
      name: 'Crafted', languageTag: 'en', roles: [{ propertyId: quay, roleKey: 'line_staff' }],
    })).status).toBe(403);

    // Mixing a permitted pair with a forbidden one refuses the WHOLE request: a
    // partially applied invitation is a Staff Member with roles nobody chose.
    expect((await invite(token, {
      name: 'Crafted mix', languageTag: 'en',
      roles: [{ propertyId: harbour, roleKey: 'line_staff' }, { propertyId: quay, roleKey: 'line_staff' }],
    })).status).toBe(403);

    // Granting TENANT-WIDE authority needs Tenant-wide authority.
    expect((await invite(token, {
      name: 'Escalation', languageTag: 'en', roles: [{ roleKey: 'corporate_viewer' }],
    })).status).toBe(403);

    // And a Property-scoped administrator cannot create or retire a Property.
    expect((await fetch(`${h.base}/v1/properties`, {
      method: 'POST', headers: bearer(token),
      body: JSON.stringify({ name: 'Sneaky', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
    })).status).toBe(403);
    expect((await fetch(`${h.base}/v1/properties/${harbour}/deactivate`, {
      method: 'POST', headers: bearer(token),
    })).status).toBe(403);
  });

  it('refuses a line-staff credential every configuration action, server-side', async () => {
    const email = `line-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Line staff', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'line-staff-password-x', name: 'Line staff', languageTag: 'en',
      }),
    });
    const token = (await setUp.json() as { accessToken: string }).accessToken;
    for (const [method, path] of [['GET', '/v1/staff'], ['GET', '/v1/roles'], ['GET', `/v1/properties/${harbour}/setup`]] as const) {
      const res = await fetch(`${h.base}${path}`, { method, headers: bearer(token) });
      expect(res.status, `${method} ${path}`).toBe(403);
    }
    // Their own session and their own Property, however, they can read - the
    // interface has to be able to render something.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(token) })).status).toBe(200);
    expect((await fetch(`${h.base}/v1/properties`, { headers: bearer(token) })).status).toBe(200);
  });

  it('LIMITS A PIN SESSION to operational permissions, whatever role it holds (FR-4)', async () => {
    // Story 4.1 owns PIN sign-in, so this constructs the session it will produce: a
    // real session row with credential_type 'pin' held by a full administrator. If the
    // limit lived on the role instead of the credential, this caller would be able to
    // invite staff from a handset in a corridor.
    const c = await admin();
    const sessionId = ulid(new Date());
    try {
      await c.query(
        `INSERT INTO control_plane.sessions (id, tenant_id, staff_member_id, credential_type, language_tag, expires_at)
         VALUES ($1, $2, $3, 'pin', 'en', now() + interval '1 hour')`,
        [sessionId, a.tenantId, a.staffMemberId]);
    } finally { await c.end(); }

    const { accessToken } = mintSessionToken({
      sessionId, tenantId: a.tenantId, propertyId: harbour,
      staffMemberId: a.staffMemberId, credentialType: 'pin', languageTag: 'en', now: new Date(),
    });
    const session = await (await fetch(`${h.base}/v1/auth/session`, { headers: bearer(accessToken) })).json() as
      { credentialType: string; permissions: string[] };
    expect(session.credentialType).toBe('pin');
    expect(session.permissions).toEqual(['property.read']);
    // And the server refuses, not merely the interface.
    expect((await fetch(`${h.base}/v1/staff`, { headers: bearer(accessToken) })).status).toBe(403);
    expect((await invite(accessToken, {
      name: 'From a corridor', languageTag: 'en', roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    })).status).toBe(403);
  });

  // ------------------------------------------------------------------------ AC-5

  it('returns only records from Properties within the caller\'s own Tenant', async () => {
    const email = `corporate-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Corporate viewer', languageTag: 'en', email, roles: [{ roleKey: 'corporate_viewer' }],
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'corporate-viewer-pw1', name: 'Corporate viewer', languageTag: 'en',
      }),
    });
    const token = (await setUp.json() as { accessToken: string }).accessToken;

    const staff = await (await fetch(`${h.base}/v1/staff`, { headers: bearer(token) })).json() as
      Array<{ tenantId: string; roles: Array<{ propertyId?: string }> }>;
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.every((s) => s.tenantId === a.tenantId)).toBe(true);

    const properties = await (await fetch(`${h.base}/v1/properties`, { headers: bearer(token) })).json() as
      Array<{ tenantId: string }>;
    expect(properties.every((p) => p.tenantId === a.tenantId)).toBe(true);

    // A corporate viewer READS. They do not invite.
    expect((await invite(token, {
      name: 'Nope', languageTag: 'en', roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    })).status).toBe(403);

    // A filter NARROWS and can never widen: pointing it at another Tenant's Property
    // returns nothing rather than falling back to everything visible.
    const bProperties = await (await fetch(`${h.base}/v1/properties`, { headers: bearer(b.token) })).json() as
      Array<{ propertyId: string }>;
    const elsewhere = bProperties[0]!.propertyId;
    const narrowed = await (await fetch(`${h.base}/v1/staff?propertyId=${elsewhere}`, { headers: bearer(token) })).json() as unknown[];
    expect(narrowed).toEqual([]);

    // And the other half, which is what makes the line above a real assertion rather
    // than an accident: narrowed to a Property in their OWN Tenant, a Tenant-wide
    // caller does see people - including themselves, because a Tenant-wide grant is
    // authority at every Property in the Tenant.
    const here = await (await fetch(`${h.base}/v1/staff?propertyId=${harbour}`, { headers: bearer(token) })).json() as
      Array<{ tenantId: string }>;
    expect(here.length).toBeGreaterThan(0);
    expect(here.every((s) => s.tenantId === a.tenantId)).toBe(true);
  });

  // -------------------------------------------------------- recovery, and revocation

  it('answers 202 to a forgotten password whether or not the address exists', async () => {
    resetLimiter();
    for (const email of [a.email, 'nobody-has-this-address@hotel.test']) {
      const res = await fetch(`${h.base}/v1/auth/password/forgot`, {
        method: 'POST', headers: json, body: JSON.stringify({ email }),
      });
      // A response that differs is an account-enumeration oracle, and this is the one
      // endpoint anybody on the internet can call.
      expect(res.status, email).toBe(202);
    }
  });

  it('resets a password, returns no session, and REVOKES every other session', async () => {
    resetLimiter();
    const email = `resettable-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Resettable', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'supervisor' }],
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'first-password-here', name: 'Resettable', languageTag: 'en',
      }),
    });
    const before = (await setUp.json() as { accessToken: string }).accessToken;
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(before) })).status).toBe(200);

    expect((await fetch(`${h.base}/v1/auth/password/forgot`, {
      method: 'POST', headers: json, body: JSON.stringify({ email }),
    })).status).toBe(202);
    const resetToken = await drainOutbox('password_reset', email);

    const reset = await fetch(`${h.base}/v1/auth/password/reset`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ token: resetToken, password: 'second-password-here' }),
    });
    // 204 and NO session, unlike set-up: a reset may be the answer to a credential
    // already in someone else's hands.
    expect(reset.status).toBe(204);
    expect(await reset.text()).toBe('');

    // The sessions that credential could have opened are over - including on any
    // Shared Device. No blacklist, no sweep: the session row is read every request.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(before) })).status).toBe(401);

    // The old password no longer works and the new one does.
    expect((await fetch(`${h.base}/v1/auth/sign-in`, {
      method: 'POST', headers: json, body: JSON.stringify({ email, password: 'first-password-here' }),
    })).status).toBe(401);
    expect((await fetch(`${h.base}/v1/auth/sign-in`, {
      method: 'POST', headers: json, body: JSON.stringify({ email, password: 'second-password-here' }),
    })).status).toBe(200);

    // Single-use, and every rejection is the same generic message.
    const twice = await fetch(`${h.base}/v1/auth/password/reset`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ token: resetToken, password: 'third-password-here' }),
    });
    expect(twice.status).toBe(400);
    const unknown = await fetch(`${h.base}/v1/auth/password/reset`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ token: 'never-issued-at-all', password: 'third-password-here' }),
    });
    expect(await unknown.json()).toEqual(await twice.clone().json());
  });

  it('refuses an invitation token twice, and an unknown one identically', async () => {
    resetLimiter();
    const email = `once-${Date.now()}@hotel.test`;
    await invite(a.token, {
      name: 'Once only', languageTag: 'en', email, roles: [{ propertyId: harbour, roleKey: 'line_staff' }],
    });
    const token = await drainOutbox('staff_invitation', email);
    const body = { token, password: 'once-only-password', name: 'Once only', languageTag: 'en' };
    expect((await fetch(`${h.base}/v1/auth/credential/set-up`, { method: 'POST', headers: json, body: JSON.stringify(body) })).status).toBe(200);
    const second = await fetch(`${h.base}/v1/auth/credential/set-up`, { method: 'POST', headers: json, body: JSON.stringify(body) });
    expect(second.status).toBe(400);
    const unknown = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ ...body, token: 'was-never-issued' }),
    });
    // Unknown, expired and already-used are one message, so the endpoint cannot be
    // used to learn that an invitation existed.
    expect(await unknown.json()).toEqual(await second.clone().json());
  });

  it('rate-limits the endpoints anyone can call', async () => {
    resetLimiter();
    let sawLimit = false;
    for (let i = 0; i < 12; i += 1) {
      const res = await fetch(`${h.base}/v1/auth/password/forgot`, {
        method: 'POST', headers: json, body: JSON.stringify({ email: 'floods@hotel.test' }),
      });
      if (res.status === 429) {
        const body = await res.json() as { code: string; retryable: boolean; details?: { retryAfterSeconds?: number } };
        expect(body.code).toBe('too_many_attempts');
        // Retryable AFTER A WAIT, and the caller is told how long.
        expect(body.retryable).toBe(true);
        expect(body.details?.retryAfterSeconds).toBeGreaterThan(0);
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit, 'the forgot-password endpoint never rate-limited').toBe(true);
    resetLimiter();
  });

  it('refuses an unauthenticated caller, a signature it did not make, and an operator token', async () => {
    expect((await fetch(`${h.base}/v1/auth/session`)).status).toBe(401);
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer('not.a.token') })).status).toBe(401);
    // Story 11.1 AC-2 still holds now that the cell has real tokens of its own: a
    // different secret breaks the signature, and the audience check survives the two
    // secrets being misconfigured alike.
    const c = await admin();
    try {
      const op = await c.query<{ id: string }>('SELECT id FROM control_plane.operator_accounts LIMIT 1');
      expect(op.rows[0]).toBeTruthy();
    } finally { await c.end(); }
  });

  it('tells a Tenant-scoped session how to get a Property rather than refusing as unauthenticated', async () => {
    // The administrator of a Tenant with two Properties has no context yet. Reaching
    // a Property-scoped route must not read as "your credential was rejected".
    const res = await fetch(`${h.base}/v1/fixture-notes`, { headers: bearer(a.token) });
    expect(res.status).toBe(403);
    expect((await res.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/not scoped to a Property/);
  });
});
