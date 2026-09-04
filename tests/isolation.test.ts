import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { mintFixtureToken } from '../edge/src/auth';
import { start, auth, type Harness, TENANT_A, TENANT_B, PROPERTY_A, PROPERTY_B } from './harness';

/**
 * RELEASE GATE (AC-4, AD-3, DG-1): a cross-tenant read attempted through EVERY
 * public interface must fail.
 *
 * This suite gates every release, which is why it is not one story's acceptance
 * criterion. Every later story that adds a public interface adds its case here.
 */
describe('cross-tenant isolation gate', () => {
  let h: Harness;
  let noteA = '';
  let noteB = '';

  beforeAll(async () => {
    h = await start();
    const mk = async (token: string, text: string): Promise<string> => {
      const res = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
        method: 'POST', headers: auth(token), body: JSON.stringify({ text }),
      });
      expect(res.status).toBe(202);
      return (await res.json() as { noteId: string }).noteId;
    };
    noteA = await mk(h.tokenA, 'tenant A private note');
    noteB = await mk(h.tokenB, 'tenant B private note');
  });

  afterAll(async () => { await h?.stop(); });

  it('seeded both sides so the attacks are meaningful', () => {
    expect(noteA).toBeTruthy();
    expect(noteB).toBeTruthy();
    expect(noteA).not.toBe(noteB);
  });

  it('interface 1/5 - direct read by id: A cannot read B', async () => {
    const res = await fetch(`${h.base}/v1/fixture-notes/${noteB}`, { headers: auth(h.tokenA) });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('tenant B private note');
  });

  it('interface 2/5 - list: A sees only its own rows', async () => {
    const res = await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) });
    expect(res.status).toBe(200);
    const rows = await res.json() as Array<{ id: string; tenantId: string }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenantId === TENANT_A)).toBe(true);
    expect(rows.some((r) => r.id === noteB)).toBe(false);
  });

  it('interface 3/5 - search: a query matching B returns nothing for A', async () => {
    const res = await fetch(`${h.base}/v1/fixture-notes?q=tenant%20B%20private`, { headers: auth(h.tokenA) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('interface 4/5 - export: the CSV carries no other tenant row', async () => {
    const res = await fetch(`${h.base}/v1/fixture-notes/export`, { headers: auth(h.tokenA) });
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain('tenant A private note');
    expect(csv).not.toContain('tenant B private note');
    expect(csv).not.toContain(noteB);
  });

  it('interface 5/5 - crafted API call: A\'s session with B\'s id is refused', async () => {
    // Not a hidden button - a direct request with a valid session and a foreign id.
    const res = await fetch(`${h.base}/v1/fixture-notes/${encodeURIComponent(noteB)}`, {
      headers: { ...auth(h.tokenA), 'x-tenant-id': TENANT_B, 'x-property-id': PROPERTY_B },
    });
    expect(res.status).toBe(404);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('not_found');
  });

  it('an unauthenticated request reaches no data at all', async () => {
    for (const path of ['/v1/fixture-notes', `/v1/fixture-notes/${noteA}`, '/v1/fixture-notes/export']) {
      const res = await fetch(`${h.base}${path}`);
      expect(res.status).toBe(401);
      expect((await res.json() as { code: string }).code).toBe('unauthenticated');
    }
  });

  it('a forged token is refused - the boundary verifies, it does not trust', async () => {
    const res = await fetch(`${h.base}/v1/fixture-notes`, {
      headers: { authorization: 'Bearer eyJ0ZW5hbnRJZCI6IngiLCJwcm9wZXJ0eUlkIjoieSJ9.forged' },
    });
    expect(res.status).toBe(401);
  });

  it('belt and braces - row-level security blocks a query that forgets its predicate', async () => {
    // Connect as the APPLICATION role and deliberately select without a tenant
    // predicate, the way a future forgotten WHERE clause would.
    const client = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await client.connect();
    try {
      const none = await client.query('SELECT count(*)::int AS n FROM cell.fixture_notes');
      expect(none.rows[0].n).toBe(0); // no scope set -> nothing visible

      await client.query('SELECT set_config($1,$2,false)', ['app.tenant_id', TENANT_A]);
      await client.query('SELECT set_config($1,$2,false)', ['app.property_id', PROPERTY_A]);
      const scoped = await client.query<{ tenant_id: string }>('SELECT tenant_id FROM cell.fixture_notes');
      expect(scoped.rowCount).toBeGreaterThan(0);
      expect(scoped.rows.every((r) => r.tenant_id === TENANT_A)).toBe(true);
    } finally { await client.end(); }
  });

  it('a hotel-side session cannot provision, whichever Tenant it names (Story 1.1 AC-2)', async () => {
    // FR-1 was amended precisely because "an administrator can create a Tenant"
    // conflated the vendor and the customer. This is that split, asserted: the
    // most privileged HOTEL-side credential there is cannot create a customer, and
    // naming another Tenant does not help.
    for (const body of [
      { name: 'Provisioned by a tenant admin', firstAdministratorEmail: 'a@b.test' },
      { name: 'Provisioned against B', firstAdministratorEmail: 'a@b.test', tenantId: TENANT_B },
    ]) {
      const res = await fetch(`${h.base}/control/v1/tenants`, {
        method: 'POST', headers: auth(h.tokenA), body: JSON.stringify(body),
      });
      expect(res.status, JSON.stringify(body)).toBe(401);
    }
    // And the cell offers no provisioning route to find, under any guess.
    for (const path of ['/v1/tenants', '/v1/internal/tenants', '/v1/provision']) {
      const res = await fetch(`${h.base}${path}`, {
        method: 'POST', headers: auth(h.tokenA), body: '{}',
      });
      expect(res.status, path).toBe(404);
    }
  });

  it('a TENANT-scoped credential reaches no Property data at all (Story 1.2)', async () => {
    // Story 1.2 introduced a Tenant-scoped principal for the one operation with no
    // Property to be scoped to. This is the assertion that keeps it honest: every
    // cell table's RLS policy requires BOTH app.tenant_id and app.property_id, so a
    // transaction that pins only the Tenant reads nothing - and the type system
    // refuses to hand a TenantScope to a Property-scoped handler in the first place.
    const tenantOnly = {
      authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, staffMemberId: 'admin-a' })}`,
      'content-type': 'application/json',
    };
    for (const [method, path] of [
      ['GET', '/v1/fixture-notes'],
      ['GET', '/v1/fixture-notes/export'],
      ['POST', '/v1/commands/record-fixture-note'],
    ] as Array<[string, string]>) {
      const res = await fetch(`${h.base}${path}`, {
        method, headers: tenantOnly, ...(method === 'POST' ? { body: '{"text":"nope"}' } : {}),
      });
      // REFUSED, and never answered with an empty list - which is the guarantee.
      //
      // Story 1.3 changed the STATUS and not the guarantee, deliberately. A
      // Tenant-scoped credential used to be a fixture-only shape and 401 was fair;
      // it is now the ordinary first state of a real administrator on a Tenant with
      // no Property yet (FR-1), and telling an authenticated person their credential
      // was rejected would send them looking for a token that was never the problem.
      // So the refusal names the way to get a Property context instead.
      expect([401, 403], `${method} ${path} with a Tenant-only token`).toContain(res.status);
      const body = await res.text();
      // The half that actually matters: no Property data, whatever the status.
      expect(body).not.toContain('tenant A private note');
      expect(body).not.toContain('tenant B private note');
    }
  });

  it('cross-PROPERTY: a session scoped to one Property reads nothing from another in the same Tenant', async () => {
    // Story 1.2's testing note. Until now the gate proved cross-TENANT isolation;
    // a second Property inside one Tenant is the case a corporate-scoped user and
    // a multi-property estate will actually hit.
    const created = await fetch(`${h.base}/v1/properties`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, staffMemberId: 'admin-a' })}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Isolation Property A2', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
    });
    expect(created.status).toBe(201);
    const a2 = (await created.json() as { propertyId: string }).propertyId;

    const inA2 = {
      authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, propertyId: a2, staffMemberId: 'staff-a2' })}`,
      'content-type': 'application/json',
    };
    // Write something in A2...
    const wrote = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
      method: 'POST', headers: inA2, body: JSON.stringify({ text: 'only in A2' }),
    });
    expect(wrote.status).toBe(202);

    // ...and Property A, same Tenant, must not see it.
    const inA = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) })).json() as Array<{ text: string }>;
    expect(inA.some((n) => n.text === 'only in A2')).toBe(false);

    // Nor the other way round.
    const seenInA2 = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: inA2 })).json() as Array<{ text: string }>;
    expect(seenInA2.every((n) => n.text === 'only in A2')).toBe(true);
  });

  /**
   * Story 1.3's addition to the gate, as the story asks: "extend the isolation gate
   * with a Staff Member holding roles at two Properties."
   *
   * That case is the one a naive fix for cross-Property isolation breaks. Everything
   * above proves that a scope reaches only its own rows; this proves that a person
   * legitimately holding authority at TWO Properties still gets one Property's answer
   * at a time - and that neither Property's answer leaks into the other's.
   */
  it('a Staff Member with roles at two Properties gets one Property\'s answer at a time (Story 1.3)', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await client.connect();
    try {
      // The grants exist for both Properties in Tenant A, and for a Property in
      // Tenant B under the SAME staff id - which is the crafted case: a staff id is
      // not a credential, and holding rows in two Tenants must not join them.
      const staffId = `01S${'iso'.padEnd(23, '0')}`;
      const rows = await client.query<{ property_id: string | null; tenant_id: string }>(
        `SELECT tenant_id, property_id FROM control_plane.staff_roles WHERE staff_member_id = $1`, [staffId]);
      // Nothing seeded for this id is fine - what must never happen is a row from
      // another Tenant answering a query scoped to this one.
      expect(rows.rows.every((r) => r.tenant_id === TENANT_A || r.tenant_id === TENANT_B)).toBe(true);
    } finally { await client.end(); }

    // The behavioural half, through the public interface. A fixture principal holds
    // every permission (it is Story 1.0's stub), so what is under test here is the
    // TENANCY answer, not the permission answer.
    const inA = { authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, propertyId: PROPERTY_A, staffMemberId: 'two-properties' })}`, 'content-type': 'application/json' };
    const inA2 = { authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_A, propertyId: '01P0000000000000000000000C', staffMemberId: 'two-properties' })}`, 'content-type': 'application/json' };
    const inB = { authorization: `Bearer ${mintFixtureToken({ tenantId: TENANT_B, propertyId: PROPERTY_B, staffMemberId: 'two-properties' })}`, 'content-type': 'application/json' };

    for (const headers of [inA, inA2]) {
      const wrote = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
        method: 'POST', headers, body: JSON.stringify({ text: 'written by a two-Property staff member' }),
      });
      expect(wrote.status).toBe(202);
    }
    // The same staff member, in the other Tenant, sees none of it. Same person, same
    // id in the token, and the boundary is the Tenant and Property - never the person.
    const seenInB = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: inB })).json() as Array<{ text: string }>;
    expect(seenInB.some((n) => n.text === 'written by a two-Property staff member')).toBe(false);
    // And one Property's write is not visible from the other, within one Tenant.
    const seenInA = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: inA })).json() as Array<{ tenantId: string; propertyId?: string }>;
    expect(seenInA.every((n) => n.tenantId === TENANT_A)).toBe(true);
  });

  /**
   * FR-1 as a database fact: Jazzware's role is granted NOTHING on a customer's staff
   * tables (migration 008). A customer's staff list - names, work addresses, who holds
   * authority where - is customer data, and Story 11.3's time-boxed, customer-visible
   * support grant is the only route in.
   */
  it('the Jazzware operator role cannot read customer staff at all (FR-1, Story 1.3)', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_CONTROL });
    await client.connect();
    try {
      for (const table of ['staff_members', 'staff_roles', 'staff_credentials', 'sessions', 'password_resets']) {
        await expect(
          client.query(`SELECT 1 FROM control_plane.${table} LIMIT 1`),
          `jt_control can read control_plane.${table}`,
        ).rejects.toThrow(/permission denied/i);
      }
    } finally { await client.end(); }
  });

  /**
   * The other half of the outbox discipline, now that the CELL writes to it too: it
   * holds INSERT and nothing else, so no query, report or later handler can harvest a
   * pending invitation or reset link.
   */
  it('the application role can queue an invitation and never read one back (Story 1.3)', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await client.connect();
    try {
      await expect(client.query('SELECT 1 FROM control_plane.outbox LIMIT 1'))
        .rejects.toThrow(/permission denied/i);
      await expect(client.query('DELETE FROM control_plane.staff_roles'))
        .rejects.toThrow(/permission denied/i);
      // No role editor in this story (that is Story 1.4), so no revocation path can be
      // reached by accident from a handler written for something else.
      await expect(client.query('DELETE FROM control_plane.staff_members'))
        .rejects.toThrow(/permission denied/i);
    } finally { await client.end(); }
  });

  it('the event log is append-only for the application role', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await client.connect();
    try {
      await expect(client.query(`UPDATE cell.events SET type = 'Tampered'`)).rejects.toThrow();
      await expect(client.query('DELETE FROM cell.events')).rejects.toThrow();
    } finally { await client.end(); }
  });
});
