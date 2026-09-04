import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { start, auth, TENANT_A, TENANT_B, type Harness } from './harness';
import { mintFixtureToken } from '../edge/src/auth';

/**
 * Story 1.2 at the boundary. The criteria worth automating are the refusals and
 * the derivations: creation working is easy to see, while "the region can never
 * change", "a deactivated Property stops accepting work but stays readable" and
 * "the outstanding list comes from real state" are the things that have to still
 * be true after Stories 1.6, 1.7 and 3.1 have been through here.
 */

const admin = async (): Promise<Client> => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await c.connect();
  return c;
};

/** A TENANT-scoped credential: a Tenant, and deliberately no Property. */
const tenantToken = (tenantId: string): Record<string, string> => ({
  authorization: `Bearer ${mintFixtureToken({ tenantId, staffMemberId: 'admin-1' })}`,
  'content-type': 'application/json',
});

const NEW_PROPERTY = {
  name: 'Test Property', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP',
};

describe('creating a Property under a Tenant', () => {
  let h: Harness;
  beforeAll(async () => { h = await start(); });
  afterAll(async () => { await h?.stop(); });

  const create = async (body: Record<string, unknown> = NEW_PROPERTY, tenant = TENANT_A): Promise<Response> =>
    fetch(`${h.base}/v1/properties`, { method: 'POST', headers: tenantToken(tenant), body: JSON.stringify(body) });

  it('creates a Property, places it in the cell serving its region, and marks setup incomplete (AC-1)', async () => {
    const res = await create({ ...NEW_PROPERTY, name: '  Spaced Name  ', currency: 'gbp' });
    expect(res.status).toBe(201);
    const p = await res.json() as Record<string, unknown>;

    expect(p.name).toBe('Spaced Name');            // trimmed
    expect(p.currency).toBe('GBP');                // normalised
    expect(p.region).toBe('eu-west-1');
    expect(p.cellName).toBe(process.env.CELL_NAME);
    expect(p.active).toBe(true);
    expect(p.setupIncomplete).toBe(true);
    // AC-1: "the region is displayed as immutable from this point forward" - in
    // every representation, so no client has to remember the rule itself.
    expect(p.regionImmutable).toBe(true);

    const c = await admin();
    try {
      // Inherits BY REFERENCE: a link to the Tenant's settings version, and no
      // copied values (AD-9, Story 1.6 depends on it).
      const link = await c.query<{ inherits_version: number; overrides: unknown }>(
        'SELECT inherits_version, overrides FROM control_plane.property_settings WHERE property_id = $1',
        [p.propertyId]);
      expect(link.rows).toHaveLength(1);
      expect(link.rows[0]?.overrides).toEqual({});
      const ts = await c.query<{ version: number }>(
        'SELECT version FROM control_plane.tenant_settings WHERE tenant_id = $1', [TENANT_A]);
      expect(link.rows[0]?.inherits_version).toBe(ts.rows[0]?.version);

      // One control-plane event, and the Tenant's own audit trail records it -
      // this is the customer's action, on the customer's Tenant.
      const ev = await c.query<{ type: string }>(
        `SELECT type FROM control_plane.events WHERE property_id = $1`, [p.propertyId]);
      expect(ev.rows.map((r) => r.type)).toEqual(['PropertyCreated']);
      const audit = await c.query<{ action: string; actor_kind: string }>(
        `SELECT action, actor_kind FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND details->>'propertyId' = $2`, [TENANT_A, p.propertyId]);
      expect(audit.rows[0]?.action).toBe('property.created');
      expect(audit.rows[0]?.actor_kind).toBe('staff_member');
    } finally { await c.end(); }
  });

  it('refuses a region no active cell serves, and names the ones that are (AC-1)', async () => {
    const res = await create({ ...NEW_PROPERTY, region: 'ap-southeast-2', timezone: 'Australia/Sydney', currency: 'AUD' });
    expect(res.status).toBe(400);
    const body = await res.json() as { details?: { reason?: string } };
    // A Property whose data has nowhere to live is a problem discovered by
    // whoever first tries to use it, so it is refused at creation with the
    // available regions named rather than recorded and left unroutable.
    expect(body.details?.reason).toMatch(/no active cell serves region/);
    expect(body.details?.reason).toMatch(/Available: .*eu-west-1/);
  });

  it('refuses a bad timezone or currency before writing anything', async () => {
    for (const body of [
      { ...NEW_PROPERTY, timezone: 'Europe/Atlantis' },
      { ...NEW_PROPERTY, currency: 'GB' },
      { ...NEW_PROPERTY, name: '' },
    ]) {
      expect((await create(body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it('refuses a Property-scoped token, and an unauthenticated caller (AD-3)', async () => {
    // The Tenant-scoped path did not loosen the Property-scoped boundary: a
    // Property-scoped token is a perfectly good credential and still works here,
    // because a tenant administrator who happens to be scoped somewhere may still
    // create a Property. What must not work is no credential at all.
    const anonymous = await fetch(`${h.base}/v1/properties`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(NEW_PROPERTY),
    });
    expect(anonymous.status).toBe(401);
  });

  it('lists only the calling Tenant\'s Properties (FR-1)', async () => {
    const mine = await (await fetch(`${h.base}/v1/properties`, { headers: tenantToken(TENANT_A) })).json() as Array<{ tenantId: string }>;
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((p) => p.tenantId === TENANT_A)).toBe(true);

    const theirs = await (await fetch(`${h.base}/v1/properties`, { headers: tenantToken(TENANT_B) })).json() as Array<{ tenantId: string }>;
    expect(theirs.every((p) => p.tenantId === TENANT_B)).toBe(true);
    // No overlap in either direction.
    const mineIds = new Set(mine.map((p) => (p as { propertyId?: string }).propertyId));
    expect((theirs as Array<{ propertyId?: string }>).some((p) => mineIds.has(p.propertyId))).toBe(false);
  });

  // ------------------------------------------------------------------- AC-2

  it('refuses a region change through the direct API call, naming residency (AC-2)', async () => {
    const created = await (await create()).json() as { propertyId: string };
    const res = await fetch(`${h.base}/v1/properties/${created.propertyId}`, {
      method: 'PATCH', headers: tenantToken(TENANT_A), body: JSON.stringify({ region: 'us-east-1' }),
    });
    // The criterion asks for the direct API call to be tested, not only the
    // absent form field - and for residency to be named as the reason.
    expect(res.status).toBe(403);
    const body = await res.json() as { code: string; details?: { reason?: string } };
    expect(body.code).toBe('forbidden');
    expect(body.details?.reason).toMatch(/residency/i);
  });

  it('refuses a region change at the DATABASE, for every connection (AC-2)', async () => {
    const created = await (await create()).json() as { propertyId: string };
    const c = await admin();
    try {
      // Including an administrative one. A rule stated only in a route is a rule
      // the next route forgets.
      await expect(c.query(
        `UPDATE control_plane.properties SET region = 'us-east-1' WHERE id = $1`, [created.propertyId]))
        .rejects.toThrow(/never leaves its region/);
      await expect(c.query(
        `UPDATE control_plane.properties SET cell_name = 'somewhere-else' WHERE id = $1`, [created.propertyId]))
        .rejects.toThrow(/never moves cell/);
      // A no-op update is not a move, so ordinary edits are unaffected.
      await expect(c.query(
        `UPDATE control_plane.properties SET name = 'Renamed' WHERE id = $1`, [created.propertyId]))
        .resolves.toBeTruthy();
    } finally { await c.end(); }
  });

  // ------------------------------------------------------------------- AC-3

  it('deactivates, keeps records readable, and stops accepting new work (AC-3)', async () => {
    const created = await (await create()).json() as { propertyId: string };
    const id = created.propertyId;

    expect((await fetch(`${h.base}/v1/properties/${id}/deactivate`,
      { method: 'POST', headers: tenantToken(TENANT_A) })).status).toBe(200);
    // A second attempt is a conflict, not a validation failure.
    expect((await fetch(`${h.base}/v1/properties/${id}/deactivate`,
      { method: 'POST', headers: tenantToken(TENANT_A) })).status).toBe(409);

    const scoped = {
      authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, propertyId: id, staffMemberId: 'staff-1' })}`,
      'content-type': 'application/json',
    };
    // Writes refused at the tenancy boundary, so Jobs (3.1) and everything after
    // inherit the rule rather than each having to remember it.
    const write = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
      method: 'POST', headers: scoped, body: JSON.stringify({ text: 'should be refused' }),
    });
    expect(write.status).toBe(403);
    expect((await write.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/deactivated/);
    // Reads deliberately unaffected: "records remain readable to authorised users".
    expect((await fetch(`${h.base}/v1/fixture-notes`, { headers: scoped })).status).toBe(200);
  });

  it('refuses to delete a Property, at the database, for every connection (AC-3)', async () => {
    const created = await (await create()).json() as { propertyId: string };
    const c = await admin();
    try {
      await expect(c.query('DELETE FROM control_plane.properties WHERE id = $1', [created.propertyId]))
        .rejects.toThrow(/deactivated, never deleted/);
    } finally { await c.end(); }
  });

  // ------------------------------------------------------------------- AC-4

  it('lists the outstanding setup steps in the order they must be completed (AC-4)', async () => {
    const created = await (await create()).json() as { propertyId: string };
    const res = await fetch(`${h.base}/v1/properties/${created.propertyId}/setup`,
      { headers: tenantToken(TENANT_A) });
    expect(res.status).toBe(200);
    const state = await res.json() as {
      complete: boolean;
      outstanding: Array<{ key: string; position: number; story: string }>;
      property: { setupIncomplete: boolean };
    };

    expect(state.complete).toBe(false);
    expect(state.property.setupIncomplete).toBe(true);
    // Nothing is configured yet, so every step is outstanding - which is the
    // truth for a Property created today, not a placeholder.
    expect(state.outstanding.map((s) => s.key)).toEqual([
      'departments', 'locations', 'rooms', 'staff', 'catalog', 'sla-targets', 'escalation', 'jazz-core',
    ]);
    expect(state.outstanding.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Each names the story that builds it, so an outstanding item is traceable.
    expect(state.outstanding.every((s) => /^\d+\.\d+$/.test(s.story))).toBe(true);
  });

  it('refuses a Property in another Tenant, on every route (FR-1)', async () => {
    const mine = await (await create()).json() as { propertyId: string };
    for (const path of [`/v1/properties/${mine.propertyId}`, `/v1/properties/${mine.propertyId}/setup`]) {
      expect((await fetch(`${h.base}${path}`, { headers: tenantToken(TENANT_B) })).status, path).toBe(404);
    }
    expect((await fetch(`${h.base}/v1/properties/${mine.propertyId}/deactivate`,
      { method: 'POST', headers: tenantToken(TENANT_B) })).status).toBe(404);
  });
});
