import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { start, auth, type Harness } from './harness';
import { CONTROL_PLANE_OPENAPI_DOCUMENT } from '../contracts/generated/ts/control-plane-openapi';
import { hashCredential } from '../adapters/src/crypto/credential';
import { closeControlPool } from '../adapters/src/postgres/control-plane-pool';
import { ulid } from '../core/src/ids';

/**
 * Stories 11.1 (operator sign-in) and 1.1 (provision a Tenant).
 *
 * The criteria worth automating are the refusals. Provisioning working is easy to
 * see; what has to keep being true a year from now is that an operator credential
 * cannot address a cell, that a hotel-side credential cannot provision, that asking
 * for support access is not being granted it, and that nobody can delete a Tenant.
 */

const admin = async (): Promise<Client> => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await c.connect();
  return c;
};

const OPERATOR_PASSWORD = 'test-operator-credential-not-a-real-one';

describe('the Jazzware-internal surface, and provisioning', () => {
  let h: Harness;
  let operatorId: string;
  let token: string;

  beforeAll(async () => {
    h = await start();
    // A dedicated operator for this suite, so it neither depends on nor disturbs
    // the deployment-seeded bootstrap account.
    const c = await admin();
    try {
      operatorId = `01O${ulid(new Date()).slice(3)}`;
      const { hash, salt } = hashCredential(OPERATOR_PASSWORD);
      await c.query(
        `INSERT INTO control_plane.operator_accounts
           (id, email, display_name, scopes, credential_hash, credential_salt, active)
         VALUES ($1, $2, 'Suite operator', $3, $4, $5, true)`,
        [operatorId, `${operatorId.toLowerCase()}@jazzware.test`,
         ['provision:tenant', 'request:support-access'], hash, salt]);
    } finally { await c.end(); }

    const res = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `${operatorId.toLowerCase()}@jazzware.test`, password: OPERATOR_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; token: { accessToken: string } };
    // The discriminated shape from the day it is built, so enabling a second
    // factor later (FR-84) changes no caller's parsing.
    expect(body.status).toBe('authenticated');
    token = body.token.accessToken;
  });

  afterAll(async () => { await h?.stop(); await closeControlPool(); });

  const op = (): Record<string, string> => ({
    authorization: `Bearer ${token}`, 'content-type': 'application/json',
  });

  // ------------------------------------------------------------------ Story 11.1

  it('refuses an unknown operator and a wrong credential identically (AC-3)', async () => {
    for (const body of [
      { email: 'nobody-at-all@jazzware.test', password: OPERATOR_PASSWORD },
      { email: `${operatorId.toLowerCase()}@jazzware.test`, password: 'wrong-credential-entirely' },
    ]) {
      const res = await fetch(`${h.base}/control/v1/operator/sign-in`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      expect(res.status).toBe(401);
      // Identical bodies: the internal surface cannot be used to discover who
      // works at Jazzware.
      expect(await res.json()).toEqual({
        code: 'unauthenticated', messageKey: 'error.unauthenticated', retryable: false,
      });
    }
  });

  it('refuses an OPERATOR token at every cell endpoint (AC-2)', async () => {
    // The separation that makes FR-1's "no standing access" enforceable. A
    // different secret already breaks the signature; the audience check in
    // edge/src/auth.ts is what survives the two secrets being misconfigured alike.
    const cellPaths: Array<[string, string]> = [
      ['GET', '/v1/fixture-notes'],
      ['GET', '/v1/fixture-notes/export'],
      ['POST', '/v1/commands/record-fixture-note'],
      ['POST', '/v1/sla/preview'],
    ];
    for (const [method, path] of cellPaths) {
      const res = await fetch(`${h.base}${path}`, {
        method, headers: op(), ...(method === 'POST' ? { body: '{}' } : {}),
      });
      expect(res.status, `${method} ${path} with an operator token`).toBe(401);
    }
  });

  it('refuses a CELL token on the internal surface (AC-3)', async () => {
    for (const path of ['/control/v1/operator/session', '/control/v1/tenants']) {
      const res = await fetch(`${h.base}${path}`, {
        method: path.endsWith('/tenants') ? 'POST' : 'GET',
        headers: auth(h.tokenA), ...(path.endsWith('/tenants') ? { body: '{}' } : {}),
      });
      expect(res.status, `${path} with a cell token`).toBe(401);
    }
  });

  it('loses access at next validation when the operator is deactivated (AC-4)', async () => {
    // A second operator, so deactivating it does not strip the suite of its own.
    const doomedId = `01O${ulid(new Date()).slice(3)}`;
    const email = `${doomedId.toLowerCase()}@jazzware.test`;
    const c = await admin();
    let doomedToken: string;
    try {
      const { hash, salt } = hashCredential(OPERATOR_PASSWORD);
      await c.query(
        `INSERT INTO control_plane.operator_accounts
           (id, email, display_name, scopes, credential_hash, credential_salt, active)
         VALUES ($1, $2, 'Doomed operator', $3, $4, $5, true)`,
        [doomedId, email, ['provision:tenant'], hash, salt]);

      const signIn = await fetch(`${h.base}/control/v1/operator/sign-in`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: OPERATOR_PASSWORD }),
      });
      doomedToken = ((await signIn.json()) as { token: { accessToken: string } }).token.accessToken;

      // The token works...
      expect((await fetch(`${h.base}/control/v1/operator/session`,
        { headers: { authorization: `Bearer ${doomedToken}` } })).status).toBe(200);

      // ...until the account is deactivated. No sweep, no blacklist: the flag is
      // read on every request, which is what "at next token validation, without a
      // manual step" means.
      await c.query('UPDATE control_plane.operator_accounts SET active = false WHERE id = $1', [doomedId]);
      expect((await fetch(`${h.base}/control/v1/operator/session`,
        { headers: { authorization: `Bearer ${doomedToken}` } })).status).toBe(401);
    } finally { await c.end(); }
  });

  it('ends only THIS session on sign-out', async () => {
    const email = `${operatorId.toLowerCase()}@jazzware.test`;
    const second = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: OPERATOR_PASSWORD }),
    });
    const secondToken = ((await second.json()) as { token: { accessToken: string } }).token.accessToken;

    expect((await fetch(`${h.base}/control/v1/operator/sign-out`,
      { method: 'POST', headers: { authorization: `Bearer ${secondToken}` } })).status).toBe(204);
    expect((await fetch(`${h.base}/control/v1/operator/session`,
      { headers: { authorization: `Bearer ${secondToken}` } })).status).toBe(401);
    // The suite's own session is untouched - sign-out is not a device wipe.
    expect((await fetch(`${h.base}/control/v1/operator/session`, { headers: op() })).status).toBe(200);
  });

  // -------------------------------------------------------------------- Story 1.1

  it('provisions a Tenant with the shipped roles and platform defaults, and nothing else (AC-1)', async () => {
    const res = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: op(),
      body: JSON.stringify({ name: 'Harbourside Collection', firstAdministratorEmail: 'gm@harbourside.test' }),
    });
    expect(res.status).toBe(201);
    const tenant = await res.json() as Record<string, unknown>;

    // The response must satisfy the shape the contract documents for it. The
    // codegen-drift gate proves the bindings match the document; nothing proved
    // the RUNNING operation did, and it did not - deactivation returned a
    // two-field object where the contract says Tenant, and answered 400 where the
    // contract says 409. Both found here.
    const doc = CONTROL_PLANE_OPENAPI_DOCUMENT as unknown as {
      components: { schemas: { Tenant: { required: string[] } } };
    };
    for (const field of doc.components.schemas.Tenant.required) {
      expect(tenant, `POST /tenants response is missing ${field}`).toHaveProperty(field);
    }

    const c = await admin();
    try {
      const id = tenant.tenantId as string;
      const count = async (sql: string): Promise<number> =>
        Number((await c.query<{ n: string }>(sql, [id])).rows[0]?.n ?? '-1');

      // FR-2's shipped role set, seeded by ONE event rather than seven writes.
      expect(await count('SELECT count(*)::text AS n FROM control_plane.roles WHERE tenant_id=$1')).toBe(7);
      // FR-1: no Properties and no identity connection - those are the customer's.
      expect(await count('SELECT count(*)::text AS n FROM control_plane.properties WHERE tenant_id=$1')).toBe(0);
      expect(await count('SELECT count(*)::text AS n FROM control_plane.tenant_settings WHERE tenant_id=$1')).toBe(1);
      // The invitation exists, granting tenant-administrator scope ONLY.
      const inv = await c.query<{ scope: string; token_hash: Buffer }>(
        'SELECT scope, token_hash FROM control_plane.invitations WHERE tenant_id=$1', [id]);
      expect(inv.rows).toHaveLength(1);
      expect(inv.rows[0]?.scope).toBe('tenant_administrator');
      // Only a hash is stored, so a database read cannot be turned into a sign-in.
      expect(inv.rows[0]?.token_hash.length).toBe(32);
      expect(JSON.stringify(tenant)).not.toContain('token');

      // One control-plane event, and property_id is NULL - the single permitted
      // exception to AD-3, which migration 004's CHECK names explicitly.
      const ev = await c.query<{ type: string; property_id: string | null }>(
        'SELECT type, property_id FROM control_plane.events WHERE tenant_id=$1', [id]);
      expect(ev.rows.map((r) => r.type)).toEqual(['TenantProvisioned']);
      expect(ev.rows[0]?.property_id).toBeNull();

      // Both audit trails, from the Tenant's first moment.
      expect(await count('SELECT count(*)::text AS n FROM control_plane.tenant_audit WHERE tenant_id=$1')).toBe(1);
      expect(await count('SELECT count(*)::text AS n FROM control_plane.operator_audit WHERE tenant_id=$1')).toBe(1);
    } finally { await c.end(); }
  });

  it('refuses provisioning to a hotel-side credential, and to a guessed cell route (AC-2)', async () => {
    // AD-11: refused server-side, not hidden in an interface. Includes the
    // tenant-administrator case, which is the one FR-1 was amended to separate.
    const res = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: auth(h.tokenA),
      body: JSON.stringify({ name: 'Hostile', firstAdministratorEmail: 'a@b.test' }),
    });
    expect(res.status).toBe(401);

    for (const path of ['/v1/tenants', '/v1/internal/tenants', '/v1/commands/provision-tenant']) {
      const guess = await fetch(`${h.base}${path}`, {
        method: 'POST', headers: auth(h.tokenA), body: JSON.stringify({ name: 'Hostile' }),
      });
      expect(guess.status, path).toBe(404);
    }
  });

  it('records a support-access request as REQUESTED, time-boxed, on the tenant\'s own trail (AC-3)', async () => {
    const created = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: op(),
      body: JSON.stringify({ name: 'Support Case Hotel', firstAdministratorEmail: 'gm@support-case.test' }),
    });
    const id = ((await created.json()) as { tenantId: string }).tenantId;

    const res = await fetch(`${h.base}/control/v1/tenants/${id}/support-access`, {
      method: 'POST', headers: op(),
      body: JSON.stringify({ reason: 'Diagnosing a reported SLA discrepancy', requestedMinutes: 120 }),
    });
    // 202, and `requested`: provisioning grants no standing access, and neither
    // does asking for it.
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ status: 'requested', requestedMinutes: 120 });

    const c = await admin();
    try {
      // Visible to the CUSTOMER, not only to Jazzware - a grant they cannot see is
      // the failure FR-1 exists to prevent.
      const trail = await c.query<{ action: string; actor_kind: string }>(
        'SELECT action, actor_kind FROM control_plane.tenant_audit WHERE tenant_id=$1 ORDER BY id', [id]);
      expect(trail.rows.map((r) => r.action)).toEqual(['tenant.provisioned', 'support_access.requested']);
      expect(trail.rows.every((r) => r.actor_kind === 'jazzware_operator')).toBe(true);

      // Time-boxing is not optional: an approved grant with no expiry is refused
      // by the database, not by whoever writes the approval story.
      await expect(c.query(
        `UPDATE control_plane.support_grants SET status='approved' WHERE tenant_id=$1`, [id],
      )).rejects.toThrow(/approved_grants_expire/);

      await expect(c.query('DELETE FROM control_plane.tenant_audit WHERE tenant_id=$1', [id]))
        .resolves.toBeTruthy();   // admin may; the application roles may not - below
    } finally { await c.end(); }
  });

  it('rejects a bad request before it touches the database', async () => {
    for (const body of [
      { name: '', firstAdministratorEmail: 'gm@x.test' },
      { name: 'No Address', firstAdministratorEmail: 'not-an-address' },
      { name: 'x'.repeat(201), firstAdministratorEmail: 'gm@x.test' },
    ]) {
      const res = await fetch(`${h.base}/control/v1/tenants`, {
        method: 'POST', headers: op(), body: JSON.stringify(body),
      });
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('deactivates a Tenant and refuses ever to delete one (AC-4)', async () => {
    const created = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: op(),
      body: JSON.stringify({ name: 'Closing Down Hotel', firstAdministratorEmail: 'gm@closing.test' }),
    });
    const id = ((await created.json()) as { tenantId: string }).tenantId;

    const off = await fetch(`${h.base}/control/v1/tenants/${id}/deactivate`, { method: 'POST', headers: op() });
    expect(off.status).toBe(200);
    expect(await off.json()).toMatchObject({ tenantId: id, active: false });

    // 409, as the contract documents: the request was well formed and the caller
    // is wrong about nothing except the current state.
    const again = await fetch(`${h.base}/control/v1/tenants/${id}/deactivate`, { method: 'POST', headers: op() });
    expect(again.status).toBe(409);

    // And deletion is refused at the storage layer, for every connection - a rule
    // stated only in a route is a rule the next route can forget.
    const c = await admin();
    try {
      await expect(c.query('DELETE FROM control_plane.tenants WHERE id=$1', [id]))
        .rejects.toThrow(/deactivated, never deleted/);
    } finally { await c.end(); }
  });

  // ---------------------------------------------------------------- its own docs

  it('serves its own Swagger UI and document, and only when switched on', async () => {
    const saved = process.env.CONTROL_PLANE_DOCS;
    try {
      // OFF by default - FR-1 makes non-advertisement a property of this surface,
      // so a reader gets 404 rather than a token prompt for a page no credential
      // would have opened.
      delete process.env.CONTROL_PLANE_DOCS;
      for (const path of ['/control/v1/docs', '/control/v1/openapi.json', '/control/v1/docs/assets/swagger-ui.css']) {
        expect((await fetch(`${h.base}${path}`)).status, `${path} with docs off`).toBe(404);
      }

      process.env.CONTROL_PLANE_DOCS = '1';
      const doc = await fetch(`${h.base}/control/v1/openapi.json`);
      expect(doc.status).toBe(200);
      const served = await doc.json() as { info: { title: string }; paths: Record<string, unknown> };
      expect(served.info.title).toMatch(/Control Plane/);

      const page = await fetch(`${h.base}/control/v1/docs`);
      expect(page.status).toBe(200);
      const html = await page.text();
      expect(page.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(html).not.toMatch(/https?:\/\/(unpkg|cdn|jsdelivr)/i);
      // Amber, not petrol: the UX spine's rule that an internal tool must not look
      // like the customer product, applied where the two are easiest to confuse.
      expect(html).toContain('#A8490B');
      expect(html).not.toContain('#27565D');
      expect(html).toContain('contracts/control-plane-openapi.yaml');

      for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js']) {
        expect((await fetch(`${h.base}/control/v1/docs/assets/${asset}`)).status, asset).toBe(200);
      }
      // The same narrow allowlist as the cell's, not an extension match.
      for (const blocked of ['index.js', 'package.json', 'absolute-path.js']) {
        expect((await fetch(`${h.base}/control/v1/docs/assets/${blocked}`)).status, blocked).toBe(404);
      }
      // HEAD works wherever GET does, or an uptime check goes red for no reason.
      for (const path of ['/control/v1/docs', '/control/v1/openapi.json']) {
        expect((await fetch(`${h.base}${path}`, { method: 'HEAD' })).status, path).toBe(200);
      }
    } finally {
      if (saved === undefined) delete process.env.CONTROL_PLANE_DOCS;
      else process.env.CONTROL_PLANE_DOCS = saved;
    }
  });

  it('never serves one surface\'s document under the other\'s prefix', async () => {
    // The invariant the whole two-document split rests on, at the layer where the
    // two surfaces look most alike. A docs page is the easiest place for them to
    // bleed together, because it is the one place they are the same KIND of thing.
    const saved = process.env.CONTROL_PLANE_DOCS;
    process.env.CONTROL_PLANE_DOCS = '1';
    try {
      const cell = await (await fetch(`${h.base}/v1/openapi.json`)).json() as { info: { title: string }; paths: Record<string, unknown> };
      const control = await (await fetch(`${h.base}/control/v1/openapi.json`)).json() as { info: { title: string }; paths: Record<string, unknown> };

      expect(cell.info.title).not.toMatch(/Control Plane/);
      expect(control.info.title).toMatch(/Control Plane/);
      // No operator or provisioning path in what the cell publishes...
      expect(Object.keys(cell.paths).filter((p) => /^\/(operator|tenants)\b/.test(p))).toEqual([]);
      // ...and no cell path in what the internal surface publishes.
      expect(Object.keys(control.paths).filter((p) => /^\/(auth|commands|fixture-notes|sla|health)\b/.test(p))).toEqual([]);
    } finally {
      if (saved === undefined) delete process.env.CONTROL_PLANE_DOCS;
      else process.env.CONTROL_PLANE_DOCS = saved;
    }
  });

  // ---------------------------------------------------------- privilege boundary

  it('gives the control-plane role no access to the cell, and no read of the outbox', async () => {
    // Story 11.1 AC-1 as a DATABASE fact rather than a permission check: `jt_control`
    // cannot read a Job even if a future handler asks it to, and cannot read back
    // the invitation token it wrote - which is what stops an operator from using a
    // provisioning response to enter the customer's first administrator account.
    const c = new Client({ connectionString: process.env.DATABASE_URL_CONTROL });
    await c.connect();
    try {
      await expect(c.query('SELECT count(*) FROM cell.events')).rejects.toThrow(/permission denied/);
      await expect(c.query('SELECT count(*) FROM cell.fixture_notes')).rejects.toThrow(/permission denied/);
      await expect(c.query('SELECT count(*) FROM control_plane.outbox')).rejects.toThrow(/permission denied/);
      // It can write one, though - delivery is the notification adapter's job.
      await expect(c.query(
        `INSERT INTO control_plane.outbox (id, kind, payload) VALUES ($1, 'test', '{}')`,
        [`01X${ulid(new Date()).slice(3)}`])).resolves.toBeTruthy();
      // Append-only, at the storage layer.
      await expect(c.query('DELETE FROM control_plane.operator_audit')).rejects.toThrow(/permission denied/);
      await expect(c.query('UPDATE control_plane.tenant_audit SET action = $1', ['tampered']))
        .rejects.toThrow(/permission denied/);
    } finally { await c.end(); }
  });

  it('gives the CELL role no sight of operator identity, invitations or grants', async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL_APP });
    await c.connect();
    try {
      for (const table of ['operator_accounts', 'operator_sessions', 'operator_audit', 'invitations', 'outbox', 'support_grants']) {
        await expect(c.query(`SELECT count(*) FROM control_plane.${table}`), table)
          .rejects.toThrow(/permission denied/);
      }
      // It keeps the directory it needs, and the roles Story 1.3 will read.
      await expect(c.query('SELECT count(*) FROM control_plane.tenants')).resolves.toBeTruthy();
      await expect(c.query('SELECT count(*) FROM control_plane.roles')).resolves.toBeTruthy();
    } finally { await c.end(); }
  });
});
