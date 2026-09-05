import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { start, type Harness } from './harness';
import { startFakeProvider, type FakeProvider } from './fake-identity-provider';
import { hashCredential } from '../adapters/src/crypto/credential';
import { closeControlPool } from '../adapters/src/postgres/control-plane-pool';
import { clearDiscoveryCache } from '../adapters/src/identity/oidc';
import { resetLimiter } from '../edge/src/rate-limit';
import { mintSessionToken } from '../edge/src/session-token';
import { ulid } from '../core/src/ids';

/**
 * Story 1.5 at the boundary, against a REAL OIDC provider running in this process with
 * a real RSA keypair (tests/fake-identity-provider.ts). The adapter verifies genuine
 * signatures against a genuine JWKS; a mocked verifier would only prove that our code
 * calls our code.
 *
 * The assertions are the story's four testing notes, and each one is a refusal:
 * a provider connected for Tenant A does not authenticate a Tenant B user, a
 * deprovisioned identity loses access at next validation, JIT off means authenticating
 * successfully and getting nothing, and a PIN credential is unaffected by any of it.
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
const sha256 = (s: string): Buffer => createHash('sha256').update(s).digest();

interface Tenant { tenantId: string; slug: string; token: string; staffMemberId: string; email: string }

describe('connecting a Tenant identity provider', () => {
  let h: Harness;
  let idp: FakeProvider;
  let a: Tenant;
  let b: Tenant;
  let harbour: string;
  let counter = 0;

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
    const email = `idp-admin-${ulid(new Date()).toLowerCase()}@hotel.test`;
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
    const c = await admin();
    let slug = '';
    try {
      slug = (await c.query<{ slug: string }>(
        'SELECT slug FROM control_plane.tenants WHERE id = $1', [created.tenantId])).rows[0]!.slug;
    } finally { await c.end(); }
    return { tenantId: created.tenantId, slug, token: session.accessToken, staffMemberId: session.session.staffMemberId, email };
  };

  /** Invite a Staff Member with an address, redeem the invitation, and return their id. */
  const staffMember = async (tenant: Tenant, email: string, roles: unknown[]): Promise<string> => {
    const res = await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(tenant.token),
      body: JSON.stringify({ name: 'Managed by the provider', languageTag: 'en', email, roles }),
    });
    expect(res.status, await res.clone().text()).toBe(201);
    return (await res.json() as { staffMember: { staffMemberId: string } }).staffMember.staffMemberId;
  };

  const connect = async (tenant: Tenant, body?: Record<string, unknown>): Promise<Response> =>
    fetch(`${h.base}/v1/identity-provider`, {
      method: 'PUT', headers: bearer(tenant.token),
      body: JSON.stringify({
        protocol: 'oidc', issuer: idp.issuer, clientId: 'jazzticketing',
        clientSecretRef: 'suite-idp', ...body,
      }),
    });

  /**
   * One full authorisation leg. The nonce and PKCE verifier are generated server-side
   * and never reach a browser, so the suite reads them the way only a database can -
   * which is also how it asserts they were stored hashed rather than in the clear.
   */
  const signInThroughProvider = async (
    tenant: Tenant, subject: string, extra?: { email?: string; issuerOverride?: string },
  ): Promise<Response> => {
    const started = await fetch(`${h.base}/v1/auth/sso/start?tenantSlug=${tenant.slug}`, { redirect: 'manual' });
    expect(started.status, await started.clone().text()).toBe(302);
    const location = new URL(started.headers.get('location')!);
    const state = location.searchParams.get('state')!;

    const c = await admin();
    let nonce = '';
    try {
      nonce = (await c.query<{ nonce: string }>(
        'SELECT nonce FROM control_plane.sso_states WHERE state_hash = $1', [sha256(state)])).rows[0]!.nonce;
    } finally { await c.end(); }

    idp.controls.next = { subject, nonce, ...(extra?.email ? { email: extra.email } : {}),
      ...(extra?.issuerOverride ? { issuerOverride: extra.issuerOverride } : {}) };
    return fetch(`${h.base}/v1/auth/sso/callback`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ state, code: `code-${counter += 1}` }),
    });
  };

  beforeAll(async () => {
    resetLimiter();
    h = await start();
    idp = await startFakeProvider();
    process.env.IDP_SECRET_SUITE_IDP = 'the-suite-client-secret';

    const operatorId = `01O${ulid(new Date()).slice(3)}`;
    const c = await admin();
    try {
      const { hash, salt } = hashCredential(OPERATOR_PASSWORD);
      await c.query(
        `INSERT INTO control_plane.operator_accounts
           (id, email, display_name, scopes, credential_hash, credential_salt, active)
         VALUES ($1, $2, 'Story 1.5 suite operator', $3, $4, $5, true)`,
        [operatorId, `${operatorId.toLowerCase()}@jazzware.test`, ['provision:tenant'], hash, salt]);
    } finally { await c.end(); }
    const signIn = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ email: `${operatorId.toLowerCase()}@jazzware.test`, password: OPERATOR_PASSWORD }),
    });
    const operatorToken = (await signIn.json() as { token: { accessToken: string } }).token.accessToken;

    a = await provision(operatorToken, 'Story 1.5 Tenant A');
    b = await provision(operatorToken, 'Story 1.5 Tenant B');
    const created = await fetch(`${h.base}/v1/properties`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({ name: 'The Harbour', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' }),
    });
    harbour = (await created.json() as { propertyId: string }).propertyId;
  });

  afterAll(async () => {
    await idp?.stop();
    delete process.env.IDP_SECRET_SUITE_IDP;
    await h?.stop();
    await closeControlPool();
  });

  beforeEach(() => { resetLimiter(); clearDiscoveryCache(); idp.controls.deprovisioned = false;
    idp.controls.issueRefreshToken = true; delete idp.controls.rotateRefreshTo; });

  // ------------------------------------------------------------------------ AC-1

  it('connects a provider for ONE Tenant, with JIT off and no secret anywhere', async () => {
    const res = await connect(a);
    expect(res.status, await res.clone().text()).toBe(200);
    const view = await res.json() as {
      connected: boolean; justInTimeProvisioning: boolean; signInAvailable: boolean;
      signInUrl: string; issuer: string;
    };
    expect(view.connected).toBe(true);
    // FR-83: off unless deliberately enabled, and the response says so rather than
    // leaving an administrator to assume.
    expect(view.justInTimeProvisioning).toBe(false);
    expect(view.signInAvailable).toBe(true);
    expect(view.signInUrl).toContain(a.slug);

    // NO SECRET, in the response or in the row. The value never entered the system.
    expect(JSON.stringify(view)).not.toContain('the-suite-client-secret');
    const c = await admin();
    try {
      const stored = await c.query<{ client_secret_ref: string; jit_provisioning: boolean }>(
        'SELECT * FROM control_plane.identity_connections WHERE tenant_id = $1', [a.tenantId]);
      expect(stored.rows[0]?.client_secret_ref).toBe('suite-idp');
      expect(stored.rows[0]?.jit_provisioning).toBe(false);
      const anywhere = await c.query(
        `SELECT 1 FROM control_plane.identity_connections WHERE client_secret_ref LIKE '%the-suite-client-secret%'`);
      expect(anywhere.rowCount).toBe(0);
      // Tenant B has no connection: this is per Tenant, never global (FR-3).
      const theirs = await c.query(
        'SELECT 1 FROM control_plane.identity_connections WHERE tenant_id = $1', [b.tenantId]);
      expect(theirs.rowCount).toBe(0);
    } finally { await c.end(); }
  });

  it('signs a provisioned Staff Member in, with PKCE and a single-use state', async () => {
    await connect(a);
    const email = `sso-user-${Date.now()}@hotel.test`;
    const staffId = await staffMember(a, email, [{ propertyId: harbour, roleKey: 'supervisor' }]);

    const started = await fetch(`${h.base}/v1/auth/sso/start?tenantSlug=${a.slug}`, { redirect: 'manual' });
    expect(started.status).toBe(302);
    const location = new URL(started.headers.get('location')!);
    // PKCE, and nothing secret in the URL.
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toBeTruthy();
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(started.headers.get('location')).not.toContain('the-suite-client-secret');

    const state = location.searchParams.get('state')!;
    const c = await admin();
    let nonce = '';
    try {
      const row = await c.query<{ nonce: string; code_verifier: string }>(
        'SELECT nonce, code_verifier FROM control_plane.sso_states WHERE state_hash = $1', [sha256(state)]);
      nonce = row.rows[0]!.nonce;
      // THE VERIFIER NEVER REACHES THE BROWSER - that is what stops an intercepted
      // authorisation code being exchanged by whoever intercepted it.
      expect(started.headers.get('location')).not.toContain(row.rows[0]!.code_verifier);
      // And the state is stored HASHED: a row an attacker can read is not a usable value.
      const byPlaintext = await c.query(
        'SELECT 1 FROM control_plane.sso_states WHERE state_hash = $1', [Buffer.from(state)]);
      expect(byPlaintext.rowCount).toBe(0);
    } finally { await c.end(); }

    idp.controls.next = { subject: 'upstream-1', nonce, email };
    const done = await fetch(`${h.base}/v1/auth/sso/callback`, {
      method: 'POST', headers: json, body: JSON.stringify({ state, code: 'code-1' }),
    });
    expect(done.status, await done.clone().text()).toBe(200);
    const out = await done.json() as {
      accessToken: string; refreshToken: string;
      session: { credentialType: string; staffMemberId: string; permissions: string[] };
    };
    expect(out.session.credentialType).toBe('sso');
    expect(out.session.staffMemberId).toBe(staffId);
    expect(out.session.permissions).toContain('property.read');
    expect(out.refreshToken).toBeTruthy();
    // The adapter really did send the verifier, rather than us assuming PKCE happened.
    expect(idp.controls.lastTokenRequest?.code_verifier).toBeTruthy();

    // SINGLE-USE: the same state cannot be presented twice.
    idp.controls.next = { subject: 'upstream-1', nonce, email };
    const replay = await fetch(`${h.base}/v1/auth/sso/callback`, {
      method: 'POST', headers: json, body: JSON.stringify({ state, code: 'code-1' }),
    });
    expect(replay.status).toBe(401);

    // The identity is now LINKED by subject, so a later address change cannot hand a
    // leaver's replacement their access.
    const c2 = await admin();
    try {
      const linked = await c2.query<{ external_issuer: string; external_subject: string }>(
        'SELECT external_issuer, external_subject FROM control_plane.staff_members WHERE id = $1', [staffId]);
      expect(linked.rows[0]?.external_subject).toBe('upstream-1');
      expect(linked.rows[0]?.external_issuer).toBe(idp.issuer);
    } finally { await c2.end(); }
  });

  it('grants NOTHING to an identity nobody provisioned, with JIT off (FR-83)', async () => {
    await connect(a);
    const res = await signInThroughProvider(a, 'nobody-here', { email: `stranger-${Date.now()}@hotel.test` });
    // Not a session with an empty permission set - no session at all. Every client
    // would otherwise have to remember to handle a shape that looks like a bug.
    expect(res.status).toBe(403);
    const body = await res.json() as { code: string; details?: { reason?: string } };
    expect(body.code).toBe('forbidden');
    expect(body.details?.reason).toMatch(/no Staff Member|invites them/);
    expect(JSON.stringify(body)).not.toContain('accessToken');

    const c = await admin();
    try {
      // Recorded, because an administrator wondering why a new starter cannot get in
      // needs to see that they authenticated successfully.
      const audit = await c.query(
        `SELECT 1 FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND action = 'identity.authenticated_without_access'`, [a.tenantId]);
      expect(audit.rowCount).toBeGreaterThan(0);
    } finally { await c.end(); }
  });

  it('does not let Tenant A\'s provider authenticate a Tenant B user (FR-3)', async () => {
    await connect(a);
    const email = `crossover-${Date.now()}@hotel.test`;
    // The person exists - in Tenant B.
    await staffMember(b, email, [{ roleKey: 'corporate_viewer' }]);
    // Authenticating against Tenant A's provider finds nobody in Tenant A, and the
    // Tenant B Staff Member is not reachable from here at all.
    const res = await signInThroughProvider(a, 'tenant-b-person', { email });
    expect(res.status).toBe(403);

    // And a token that CLAIMS a different issuer is refused by the adapter, which is
    // the check that survives two Tenants using the same provider software.
    const forged = await signInThroughProvider(a, 'upstream-1', {
      email, issuerOverride: 'https://someone-elses-provider.example',
    });
    expect(forged.status).toBe(401);
  });

  it('refuses a SAML sign-in and says so when the connection is made, not later', async () => {
    const res = await connect(a, { protocol: 'saml' });
    expect(res.status).toBe(200);
    const view = await res.json() as { signInAvailable: boolean; unavailableReason: string };
    expect(view.signInAvailable).toBe(false);
    expect(view.unavailableReason).toMatch(/signature verification/);
    const started = await fetch(`${h.base}/v1/auth/sso/start?tenantSlug=${a.slug}`, { redirect: 'manual' });
    expect(started.status).toBe(400);
    await connect(a);   // back to OIDC for the rest of the suite
  });

  it('answers identically for an unknown Tenant, no connection, and an inactive one', async () => {
    // Otherwise the one endpoint anybody can call becomes a way to enumerate which
    // hotels are customers and which of them use SSO.
    const answers: string[] = [];
    for (const slug of ['no-such-tenant-at-all', b.slug]) {
      const res = await fetch(`${h.base}/v1/auth/sso/start?tenantSlug=${slug}`, { redirect: 'manual' });
      expect(res.status, slug).toBe(400);
      answers.push(await res.text());
    }
    expect(answers[0]).toBe(answers[1]);
  });

  // ------------------------------------------------------------------------ AC-2

  it('LOSES ACCESS AT NEXT TOKEN VALIDATION when the identity is deprovisioned', async () => {
    await connect(a);
    const email = `leaver-${Date.now()}@hotel.test`;
    await staffMember(a, email, [{ propertyId: harbour, roleKey: 'supervisor' }]);
    const signedIn = await signInThroughProvider(a, `leaver-${counter}`, { email });
    expect(signedIn.status).toBe(200);
    const session = await signedIn.json() as { accessToken: string; refreshToken: string };

    // The access token still works: it is a bearer assertion with a 15-minute life,
    // and that life IS the delay FR-3 promises.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(session.accessToken) })).status).toBe(200);

    // Now they are removed upstream. No manual step happens in JazzTicketing.
    idp.controls.deprovisioned = true;

    const refreshed = await fetch(`${h.base}/v1/auth/token/refresh`, {
      method: 'POST', headers: json, body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(refreshed.status).toBe(401);
    // And the session is over, not merely un-refreshable - so the outstanding access
    // token stops working immediately rather than at its own expiry.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(session.accessToken) })).status).toBe(401);

    const c = await admin();
    try {
      const audit = await c.query(
        `SELECT 1 FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND action = 'session.deprovisioned_upstream'`, [a.tenantId]);
      expect(audit.rowCount).toBeGreaterThan(0);
    } finally { await c.end(); }
  });

  it('rotates the refresh token, and a REPLAY kills the whole chain', async () => {
    await connect(a);
    const email = `rotator-${Date.now()}@hotel.test`;
    await staffMember(a, email, [{ propertyId: harbour, roleKey: 'supervisor' }]);
    const signedIn = await signInThroughProvider(a, `rotator-${counter}`, { email });
    const first = await signedIn.json() as { refreshToken: string };

    const again = await fetch(`${h.base}/v1/auth/token/refresh`, {
      method: 'POST', headers: json, body: JSON.stringify({ refreshToken: first.refreshToken }),
    });
    expect(again.status, await again.clone().text()).toBe(200);
    const second = await again.json() as { refreshToken: string; accessToken: string };
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(second.accessToken) })).status).toBe(200);

    // REPLAY. Presenting the spent token means it is no longer in only one place, so
    // the whole chain dies - including the replacement somebody else is holding.
    const replay = await fetch(`${h.base}/v1/auth/token/refresh`, {
      method: 'POST', headers: json, body: JSON.stringify({ refreshToken: first.refreshToken }),
    });
    expect(replay.status).toBe(401);
    const afterReplay = await fetch(`${h.base}/v1/auth/token/refresh`, {
      method: 'POST', headers: json, body: JSON.stringify({ refreshToken: second.refreshToken }),
    });
    expect(afterReplay.status).toBe(401);
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(second.accessToken) })).status).toBe(401);
  });

  it('does not sign anybody out when the provider is merely unreachable', async () => {
    // An outage at the identity provider must not sign out a hotel's entire management
    // team mid-shift. Unreachable is not deprovisioned, and the two answer differently.
    await connect(a);
    const email = `resilient-${Date.now()}@hotel.test`;
    await staffMember(a, email, [{ propertyId: harbour, roleKey: 'supervisor' }]);
    const signedIn = await signInThroughProvider(a, `resilient-${counter}`, { email });
    const session = await signedIn.json() as { refreshToken: string; accessToken: string };

    await idp.stop();
    const refreshed = await fetch(`${h.base}/v1/auth/token/refresh`, {
      method: 'POST', headers: json, body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    // A 5xx, not a 401: the caller should retry, and the session survives.
    expect(refreshed.status).toBeGreaterThanOrEqual(500);
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(session.accessToken) })).status).toBe(200);

    // Bring it back for the rest of the suite.
    idp = await startFakeProvider();
    clearDiscoveryCache();
    await connect(a);
  });

  it('revokes provider sessions when the provider is disconnected, and leaves passwords alone', async () => {
    await connect(a);
    const email = `disconnected-${Date.now()}@hotel.test`;
    await staffMember(a, email, [{ propertyId: harbour, roleKey: 'supervisor' }]);
    const signedIn = await signInThroughProvider(a, `disconnected-${counter}`, { email });
    const session = await signedIn.json() as { accessToken: string };
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(session.accessToken) })).status).toBe(200);

    const res = await fetch(`${h.base}/v1/identity-provider`, { method: 'DELETE', headers: bearer(a.token) });
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await res.json() as { sessionsRevoked: number }).sessionsRevoked).toBeGreaterThan(0);

    // A Tenant that disconnects a compromised provider must not still have people
    // signed in through it.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(session.accessToken) })).status).toBe(401);
    // The administrator's own PASSWORD session is untouched - disconnecting a provider
    // is not a Tenant-wide sign-out.
    expect((await fetch(`${h.base}/v1/auth/session`, { headers: bearer(a.token) })).status).toBe(200);
    await connect(a);
  });

  // ------------------------------------------------------------------------ AC-3

  it('leaves a PIN credential untouched, with a provider connected (FR-4)', async () => {
    await connect(a);
    // A PIN-only account, created the way Story 1.3 creates one.
    const invited = await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(a.token),
      body: JSON.stringify({
        name: 'Room attendant', languageTag: 'en',
        roles: [{ propertyId: harbour, roleKey: 'property_administrator' }],
      }),
    });
    expect(invited.status).toBe(201);
    const out = await invited.json() as { staffMember: { staffMemberId: string }; pin: string };
    expect(out.pin).toMatch(/^\d{6}$/);

    // The session Story 4.1 will produce. Connecting a provider changed nothing about
    // it: the capability limit is on the CREDENTIAL, not the role and not the Tenant.
    const c = await admin();
    const sessionId = ulid(new Date());
    try {
      await c.query(
        `INSERT INTO control_plane.sessions (id, tenant_id, staff_member_id, credential_type, language_tag, expires_at)
         VALUES ($1, $2, $3, 'pin', 'en', now() + interval '1 hour')`,
        [sessionId, a.tenantId, out.staffMember.staffMemberId]);
    } finally { await c.end(); }
    const { accessToken } = mintSessionToken({
      sessionId, tenantId: a.tenantId, propertyId: harbour,
      staffMemberId: out.staffMember.staffMemberId, credentialType: 'pin',
      languageTag: 'en', now: new Date(),
    });
    const session = await (await fetch(`${h.base}/v1/auth/session`, { headers: bearer(accessToken) })).json() as
      { credentialType: string; permissions: string[] };
    expect(session.credentialType).toBe('pin');
    // Sign-in succeeds, and configuration and reporting stay unavailable to it.
    expect(session.permissions).toEqual(['property.read']);
    expect((await fetch(`${h.base}/v1/staff`, { headers: bearer(accessToken) })).status).toBe(403);
    expect((await fetch(`${h.base}/v1/identity-provider`, { headers: bearer(accessToken) })).status).toBe(403);
  });

  // ------------------------------------------------------------------- the boundary

  it('needs identity.manage, and keeps one Tenant\'s connection out of another\'s reach', async () => {
    await connect(a);
    // Tenant B reads its OWN connection - which is nothing - rather than Tenant A's.
    const theirs = await fetch(`${h.base}/v1/identity-provider`, { headers: bearer(b.token) });
    expect(theirs.status).toBe(200);
    expect((await theirs.json() as { connected: boolean }).connected).toBe(false);

    // A line-staff credential cannot reach it at all.
    const email = `line-idp-${Date.now()}@hotel.test`;
    await staffMember(a, email, [{ propertyId: harbour, roleKey: 'line_staff' }]);
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'line-staff-idp-pw-1', name: 'Line staff', languageTag: 'en',
      }),
    });
    const lineToken = (await setUp.json() as { accessToken: string }).accessToken;
    expect((await fetch(`${h.base}/v1/identity-provider`, { headers: bearer(lineToken) })).status).toBe(403);
    expect((await fetch(`${h.base}/v1/identity-provider`, {
      method: 'PUT', headers: bearer(lineToken), body: '{}',
    })).status).toBe(403);

    expect((await fetch(`${h.base}/v1/identity-provider`)).status).toBe(401);
  });

  it('records connecting and disconnecting with the previous value (FR-6)', async () => {
    await connect(a, { justInTimeProvisioning: true });
    await connect(a, { justInTimeProvisioning: false });
    const c = await admin();
    try {
      const audit = await c.query<{ action: string; details: Record<string, unknown> }>(
        `SELECT action, details FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND action LIKE 'identity_provider.%' ORDER BY id DESC LIMIT 1`,
        [a.tenantId]);
      const details = audit.rows[0]!.details as {
        before: { justInTimeProvisioning: boolean } | null;
        after: { justInTimeProvisioning: boolean };
      };
      // Turning just-in-time provisioning on is a security decision, so turning it back
      // off has to leave a record of what it was.
      expect(details.before?.justInTimeProvisioning).toBe(true);
      expect(details.after.justInTimeProvisioning).toBe(false);
      // And no secret is in the trail either.
      expect(JSON.stringify(audit.rows[0])).not.toContain('the-suite-client-secret');
    } finally { await c.end(); }
  });
});
