import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
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

  it('the event log is append-only for the application role', async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await client.connect();
    try {
      await expect(client.query(`UPDATE cell.events SET type = 'Tampered'`)).rejects.toThrow();
      await expect(client.query('DELETE FROM cell.events')).rejects.toThrow();
    } finally { await client.end(); }
  });
});
