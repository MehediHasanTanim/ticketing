import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { getPool, withScope } from '../../adapters/src/postgres/pool';
import { pingRedis } from '../../adapters/src/cache/redis-probe';
import { cellName } from '../../adapters/src/postgres/config';
import { byId, list } from '../../adapters/src/postgres/fixture-note-read-model';
import { handleRecordFixtureNote } from '../../app/src/record-fixture-note';
import { systemClock } from '../../app/src/clock';
import { foldSla } from '../../core/src/job';
import { ValidationError } from '../../core/src/fixture/note';
import { type Principal } from './auth';
import { asTenantId, asPropertyId, asStaffMemberId, type TenantScope } from '../../core/src/tenancy';
import {
  resolveCellPrincipal, toClaims, decide, sessionFor, sourceOf, type CellPrincipal,
} from './authorise';
import { mintSessionToken } from './session-token';
import { consume, LIMITS } from './rate-limit';
import { withoutScope } from '../../adapters/src/postgres/pool';
import {
  handleSignIn, handleCredentialSetUp, handlePasswordForgot, handlePasswordReset,
  handleSwitchContext, resolveSession, Unauthenticated, Forbidden as StaffForbidden,
  NotFound as StaffNotFound, type SessionFacts,
} from '../../app/src/staff/sessions';
import {
  handleInviteStaffMember, listStaffMembers, listRoles,
  ConflictError as StaffConflict,
} from '../../app/src/staff/invite-staff-member';
import type { Permission } from '../../core/src/staff/roles';
import {
  getIdentityProvider, handleConnectIdentityProvider, handleDisconnectIdentityProvider,
} from '../../app/src/identity/connect';
import {
  handleSsoStart, handleSsoCallback, handleRefresh, SsoUnavailable,
} from '../../app/src/identity/sso';
import { oidcProvider } from '../../adapters/src/identity/oidc';
import {
  getTenantSettings, handleUpdateTenantSettings,
  getPropertySettings, handleOverridePropertySettings,
} from '../../app/src/tenant/settings';
import { SecretUnavailable } from '../../adapters/src/identity/secret-store';
import {
  handleDuplicateRole, handleUpdateRole, listPermissions,
  ShippedRoleImmutable, RoleKeyTaken, Escalation, DependencyUnmet,
} from '../../app/src/role/manage';
import type { SessionView } from '../../app/src/staff/sessions';
import { docsEnabled, serveDocsAsset, serveDocsPage, serveOpenApiDocument } from './docs';
import { unimplementedStory } from './not-implemented';
import { handleControlPlane, isControlPlanePath } from './control-plane/router';
import { withTenantScope } from '../../adapters/src/postgres/pool';
import {
  handleCreateProperty, listProperties, propertySetupState, handleDeactivateProperty,
  assertPropertyRegionUnchanged, NotFound as PropertyNotFound,
  ConflictError as PropertyConflict, RegionImmutable,
} from '../../app/src/property/create-property';
import { envelope, statusFor, type ErrorCode } from './errors';

/**
 * edge/: HTTP, auth, TENANCY RESOLUTION. No domain logic lives here.
 *
 * FRAMEWORK NOTE (a deliberate, reported deviation - see the story's Dev Agent
 * Record): the architecture spine proposes NestJS, and the current major is 12.x
 * against the spine's assumed 10.x. Web access is blocked in this environment, so
 * adopting an unread brand-new major on day one would be exactly the silent
 * assumption AC-7 forbids. Story 1.0's acceptance criteria name no framework, so
 * the routing layer here is ~40 lines of node:http and the framework decision stays
 * open for Tanim. Swapping it in Story 3.1 is cheap; unpicking a wrong guess is not.
 */

type Handler = (req: IncomingMessage, res: ServerResponse, ctx: Ctx) => Promise<void>;
interface Ctx { principal: Principal; url: URL }

const json = (res: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
};
const fail = (res: ServerResponse, code: ErrorCode, details?: Record<string, unknown>): void =>
  json(res, statusFor(code), envelope(code, details));

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ValidationError('body must be JSON'); }
};

/**
 * A Tenant scope from any cell principal, Tenant- or Property-scoped. Deliberately
 * drops the Property: `withTenantScope` refuses one (AD-3), and the control-plane
 * reads these routes make carry their own explicit predicates.
 */
const tenantScopeOf = (p: CellPrincipal): TenantScope => ({
  tenantId: asTenantId(p.tenantId),
  ...(p.staffMemberId ? { staffMemberId: asStaffMemberId(p.staffMemberId) } : {}),
});

/**
 * ASK THE ONE QUESTION (AD-11). Every gated route in this file goes through here, so
 * there is exactly one place a permission question is answered and exactly one place
 * each denial becomes a status. Returns undefined once it has already answered.
 */
async function gate(
  res: ServerResponse, principal: CellPrincipal, permission: Permission, now: Date,
): Promise<SessionView | undefined> {
  const verdict = await withTenantScope(tenantScopeOf(principal), (c) => decide(c, principal, permission, now));
  if ('deny' in verdict) {
    if (verdict.deny === 'unauthenticated') { fail(res, 'unauthenticated', { reason: verdict.reason }); return undefined; }
    fail(res, 'forbidden', { reason: verdict.reason });
    return undefined;
  }
  return verdict.session;
}

/** A minted token plus the session it speaks for, which is the `SessionToken` shape. */
async function sessionTokenFor(facts: SessionFacts, now: Date): Promise<unknown> {
  const minted = mintSessionToken({ ...facts, now });
  const session = await withTenantScope(
    { tenantId: asTenantId(facts.tenantId), staffMemberId: asStaffMemberId(facts.staffMemberId) },
    (c) => resolveSession(c, {
      sessionId: facts.sessionId, tenantId: facts.tenantId,
      ...(facts.propertyId ? { propertyId: facts.propertyId } : {}),
      staffMemberId: facts.staffMemberId, credentialType: facts.credentialType,
      languageTag: facts.languageTag,
    }, now));
  return {
    accessToken: minted.accessToken, tokenType: 'Bearer',
    expiresInSeconds: minted.expiresInSeconds, session,
  };
}

/**
 * The endpoints anyone on the internet can call. Per address AND per source, because
 * per-address alone lets one source spray a dictionary across many addresses and
 * per-source alone lets a botnet hammer one address. See rate-limit.ts for what this
 * control does not do.
 */
const limited = (
  res: ServerResponse, req: IncomingMessage, limit: { max: number; windowMs: number },
  operation: string, subject: string | undefined, now: Date,
): boolean => {
  // TWO INDEPENDENT KEYS, and they have to be independent to be worth anything: a
  // per-subject key that also includes the source is still per-subject, so one
  // machine could spray a dictionary across many addresses and never hit a limit.
  // The source key therefore carries the operation and the source alone.
  const keys = [`${operation}|src|${sourceOf(req)}`];
  if (subject) keys.push(`${operation}|subject|${subject}`);
  for (const key of keys) {
    const verdict = consume(key, limit, now);
    if (!verdict.allowed) {
      fail(res, 'too_many_attempts', { retryAfterSeconds: verdict.retryAfterSeconds });
      return true;
    }
  }
  return false;
};


const routes: Array<{ method: string; path: RegExp; handler: Handler }> = [
  { method: 'POST', path: /^\/v1\/commands\/record-fixture-note$/, handler: async (req, res, ctx) => {
      const body = (await readBody(req)) as { text?: string; clientKey?: string };
      const out = await withScope(ctx.principal, (client) =>
        handleRecordFixtureNote(client, ctx.principal, { text: body.text ?? '', ...(body.clientKey ? { clientKey: body.clientKey } : {}) }, systemClock));
      json(res, 202, {
        eventId: out.eventId, noteId: out.noteId, type: 'FixtureNoteRecorded',
        occurredAt: out.occurredAt, recordedAt: out.recordedAt,
        tenantId: ctx.principal.tenantId, propertyId: ctx.principal.propertyId });
    } },
  { method: 'GET', path: /^\/v1\/fixture-notes$/, handler: async (_req, res, ctx) => {
      const q = ctx.url.searchParams.get('q') ?? undefined;
      const rows = await withScope(ctx.principal, (client) => list(client, q));
      json(res, 200, rows);
    } },
  { method: 'GET', path: /^\/v1\/fixture-notes\/export$/, handler: async (_req, res, ctx) => {
      const rows = await withScope(ctx.principal, (client) => list(client));
      const csv = ['id,text,recordedAt', ...rows.map((r) =>
        `${r.id},"${r.text.replace(/"/g, '""')}",${r.recordedAt}`)].join('\n');
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8' });
      res.end(csv);
    } },
  { method: 'GET', path: /^\/v1\/fixture-notes\/([^/]+)$/, handler: async (_req, res, ctx) => {
      const id = decodeURIComponent(ctx.url.pathname.split('/').pop() ?? '');
      const row = await withScope(ctx.principal, (client) => byId(client, id));
      if (!row) return fail(res, 'not_found');
      json(res, 200, row);
    } },
  { method: 'POST', path: /^\/v1\/sla\/preview$/, handler: async (req, res) => {
      const b = (await readBody(req)) as { events?: []; targetMinutes?: number; now?: string };
      if (!Array.isArray(b.events) || typeof b.targetMinutes !== 'number' || !b.now) {
        return fail(res, 'validation_failed', { required: ['events', 'targetMinutes', 'now'] });
      }
      json(res, 200, foldSla({ events: b.events, targetMinutes: b.targetMinutes, now: b.now }));
    } },
];

/**
 * Is this Property still accepting writes? A directory read, not a scoped one:
 * `control_plane.properties` carries no row-level security (AD-4), so the Tenant
 * and Property are named explicitly in the predicate.
 *
 * A Property with no directory row is treated as ACCEPTING - the Story 1.0 fixture
 * scopes predate the directory, and failing closed here would refuse every write in
 * the isolation gate for a reason that has nothing to do with deactivation. The
 * boundary that matters for an unknown Property is row-level security, which
 * returns nothing for a scope that owns nothing.
 */
async function propertyAcceptsWrites(principal: Principal): Promise<boolean> {
  try {
    const res = await getPool().query<{ active: boolean }>(
      'SELECT active FROM control_plane.properties WHERE id = $1 AND tenant_id = $2',
      [principal.propertyId, principal.tenantId]);
    const row = res.rows[0];
    return row ? row.active : true;
  } catch {
    // A directory that cannot be read is a datastore problem, not a deactivation.
    // Health reports it; this must not turn it into a puzzling 403.
    return true;
  }
}

export function createApp(): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // ONE clock reading per request. Two readings inside one request can disagree
    // across a token's expiry boundary, and a session that is valid for the gate and
    // expired for the handler is the kind of defect that reproduces once a day.
    const now = new Date();
    try {
      // GET and HEAD are equivalent on the public routes. Monitoring and probes
      // routinely use HEAD, and a HEAD that 401s where GET succeeds is a bug
      // nobody notices until an uptime check goes red.
      const readMethod = req.method === 'GET' || req.method === 'HEAD';

      // Health is the only unauthenticated route.
      if (readMethod && url.pathname === '/v1/health') {
        // Health NEVER throws and never 500s. An orchestrator and a property
        // administrator both read it to find out what is wrong; a 500 tells them
        // nothing except that the thing they were asking is also broken. A missing
        // DATABASE_URL is a config error that surfaces here as `unreachable`,
        // which is exactly what the reader needs to see.
        const [eventStore, cache] = await Promise.all([
          Promise.resolve()
            .then(() => getPool().query('SELECT 1'))
            .then(() => 'ok' as const)
            .catch(() => 'unreachable' as const),
          // Fallback matches the HOST-published port in docker-compose.yml and
          // .env.example (6380), not Redis's standard 6379 - a developer running
          // the API on the host against the compose cell reaches it there.
          pingRedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6380')
            .then((ok) => (ok ? 'ok' as const : 'unreachable' as const))
            .catch(() => 'unreachable' as const),
        ]);
        const status = eventStore === 'ok' && cache === 'ok' ? 'ok' : 'degraded';
        let cell = 'unconfigured';
        try { cell = cellName(); } catch { /* CELL_NAME unset - report it, do not crash */ }
        return json(res, 200, { status, api: 'ok', eventStore, cache, cell });
      }

      // ---- documentation, served from the schema of record ----
      // Unauthenticated, like health, and for the same reason: the shape of an API
      // is not tenant data, and every operation it describes is permission-gated
      // server-side (AD-11). `API_DOCS=0` turns both routes off.
      const isDocsPath = url.pathname === '/v1/openapi.json'
        || url.pathname === '/v1/docs' || url.pathname === '/v1/docs/'
        || url.pathname.startsWith('/v1/docs/assets/');

      // Disabled means GONE, not "needs a credential". The spec documents 404 for
      // a disabled docs route, and a 401 there would send a reader looking for a
      // token that would not have helped.
      if (isDocsPath && !docsEnabled()) return fail(res, 'not_found');

      if (readMethod && docsEnabled()) {
        const m = req.method ?? 'GET';
        if (url.pathname === '/v1/openapi.json') return serveOpenApiDocument(res, m);
        if (url.pathname === '/v1/docs' || url.pathname === '/v1/docs/') return serveDocsPage(res, m);
        // Capture the whole remainder, not a single segment, so a traversal attempt
        // is answered by the asset handler's 404 rather than falling through to the
        // authenticated routes and getting a misleading 401.
        const asset = /^\/v1\/docs\/assets\/(.*)$/.exec(url.pathname);
        if (asset) return serveDocsAsset(decodeURIComponent(asset[1] ?? ''), req, res);
      }

      // ---- the Jazzware-internal surface (Stories 11.1, 1.1) ----
      // A routing namespace, per Story 1.1's structure notes ("no separate
      // deployable"). It is answered BEFORE the cell's tenancy resolution because
      // an operator token is not a cell credential and must never be resolved as
      // one - and the cell's own routes never see a /control/v1 path, so neither
      // surface is reachable by guessing at the other's prefix. The deployment
      // question is raised in the router's own comment.
      if (isControlPlanePath(url.pathname)) {
        if (await handleControlPlane(req, res, url, new Date())) return;
      }

      // ---- documented, not built yet ----
      // Answered before tenancy resolution: four of these operations are how a
      // caller GETS a credential, so demanding one to be told the operation does
      // not exist would be circular. The set is derived from the OpenAPI document,
      // so it retires itself story by story - see not-implemented.ts.
      const story = unimplementedStory(req, url.pathname);
      if (story) return fail(res, 'not_implemented', { story });

      // ---- authentication (Story 1.3) ----
      // BEFORE tenancy resolution, because these four are how a caller OBTAINS a
      // credential: demanding one in order to sign in would be circular. They were
      // answered by the 501 stub until this story flipped their flags in
      // contracts/openapi.yaml, and the smoke suite fails if a flag is flipped
      // without a handler landing here.
      if (url.pathname === '/v1/auth/sign-in' && req.method === 'POST') {
        const b = (await readBody(req)) as Record<string, unknown>;
        if (limited(res, req, LIMITS.signIn, 'sign-in', String(b.email ?? '').trim().toLowerCase(), now)) return;
        const facts = await withoutScope((c) => handleSignIn(c, b, now));
        // ONE response type whether or not a second factor is needed, so Story 12.2
        // makes the other branch reachable without changing any caller's parsing.
        return json(res, 200, { status: 'authenticated', token: await sessionTokenFor(facts, now) });
      }

      if (url.pathname === '/v1/auth/credential/set-up' && req.method === 'POST') {
        const b = (await readBody(req)) as Record<string, unknown>;
        // Keyed by SOURCE ONLY: keying by the token would let an attacker with many
        // guesses spread them across keys, which is the opposite of a limit.
        if (limited(res, req, LIMITS.credentialSetUp, 'credential-set-up', undefined, now)) return;
        const facts = await withoutScope((c) => handleCredentialSetUp(c, b, now));
        return json(res, 200, await sessionTokenFor(facts, now));
      }

      if (url.pathname === '/v1/auth/password/forgot' && req.method === 'POST') {
        const b = (await readBody(req)) as Record<string, unknown>;
        if (limited(res, req, LIMITS.passwordForgot, 'password-forgot', String(b.email ?? '').trim().toLowerCase(), now)) return;
        // ALWAYS 202. Whether the address exists, whether it has a password, whether
        // its Tenant is active - the answer is identical, because a response that
        // differs is an account-enumeration oracle and this is the one endpoint
        // anybody can call. The count is logged, never returned.
        const queued = await withoutScope((c) => handlePasswordForgot(c, b, now));
        if (queued === 0) console.log('[auth] password reset requested for an address with no account');
        res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' });
        return res.end('{}');
      }

      if (url.pathname === '/v1/auth/password/reset' && req.method === 'POST') {
        const b = (await readBody(req)) as Record<string, unknown>;
        if (limited(res, req, LIMITS.passwordReset, 'password-reset', undefined, now)) return;
        await withoutScope((c) => handlePasswordReset(c, b, now));
        // 204 AND NO SESSION, unlike set-up: a reset may be the answer to a
        // credential already in someone else's hands, so every other session for
        // this Staff Member has just been revoked and they sign in again.
        res.writeHead(204);
        return res.end();
      }

      // ---- sign-in through the Tenant's identity provider (Story 1.5) ----
      // Public, like the password fallback and for the same reason: these are how a
      // caller OBTAINS a credential, so demanding one would be circular.
      if (readMethod && url.pathname === '/v1/auth/sso/start') {
        const out = await withoutScope((c) => handleSsoStart(c, oidcProvider, {
          tenantSlug: url.searchParams.get('tenantSlug') ?? '',
          ...(url.searchParams.get('returnTo') ? { returnTo: url.searchParams.get('returnTo')! } : {}),
        }, now));
        // A 302 and nothing else. No token, no secret and no assertion is in this URL -
        // a client id, a PKCE challenge and two opaque random values.
        res.writeHead(302, { location: out.location, 'cache-control': 'no-store' });
        return res.end();
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/sso/callback') {
        const b = (await readBody(req)) as Record<string, unknown>;
        if (limited(res, req, LIMITS.signIn, 'sso-callback', undefined, now)) return;
        const out = await withoutScope((c) => handleSsoCallback(c, oidcProvider, b, now));
        // A REFUSAL IS A RESULT here, not an exception: consuming the single-use state
        // and recording the attempt have to survive the refusal, and throwing rolled
        // both back with the transaction that carried them.
        if (!out.ok) {
          return fail(res, out.status === 403 ? 'forbidden' : 'unauthenticated', { reason: out.reason });
        }
        return json(res, 200, {
          ...(await sessionTokenFor(out.facts, now)) as Record<string, unknown>,
          refreshToken: out.refreshToken,
          ...(out.returnTo ? { returnTo: out.returnTo } : {}),
        });
      }

      if (req.method === 'POST' && url.pathname === '/v1/auth/token/refresh') {
        const b = (await readBody(req)) as { refreshToken?: string };
        if (limited(res, req, LIMITS.signIn, 'token-refresh', undefined, now)) return;
        // WHERE DEPROVISIONING BITES (AC-2). The access token is 15 minutes precisely
        // so that this happens often - that number is the delay FR-3 promises, and it
        // is a product decision recorded in ADR 0002, not a constant to tune.
        const out = await withoutScope((c) => handleRefresh(c, oidcProvider, String(b.refreshToken ?? ''), now));
        // Same reason: a replayed chain and a deprovisioned session are REVOKED before
        // the refusal, and that revocation must commit.
        if (!out.ok) return fail(res, 'unauthenticated', { reason: out.reason });
        return json(res, 200, {
          ...(await sessionTokenFor(out.facts, now)) as Record<string, unknown>,
          refreshToken: out.refreshToken,
        });
      }

      // ---- Tenant defaults and their blast radius (Story 1.6, FR-83) ----
      // TENANT-scope authority: changing a default changes it for every Property that
      // inherits it, and on a 200-Property estate (NFR-4) that is a 200-Property change.
      if (url.pathname === '/v1/tenant/settings') {
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        const scope = tenantScopeOf(principal);
        const actor = { tenantId: principal.tenantId, staffMemberId: principal.staffMemberId };

        if (readMethod) {
          // Read needs only `property.read`: the blast radius is what an administrator
          // consults BEFORE deciding, and gating the number behind the authority to
          // change it would mean the only people who can see the consequence are the
          // ones who have already decided they can live with it.
          if (!(await gate(res, principal, 'property.read', now))) return;
          return json(res, 200, await withTenantScope(scope, (c) => getTenantSettings(c, actor.tenantId)));
        }
        if (req.method === 'PATCH') {
          if (!(await gate(res, principal, 'settings.manage', now))) return;
          const b = await readBody(req);
          return json(res, 200, await withTenantScope(scope, (c) =>
            handleUpdateTenantSettings(c, actor, b, now)));
        }
        return fail(res, 'not_found');
      }

      // ---- the Tenant's identity connection (Story 1.5, FR-3) ----
      if (url.pathname === '/v1/identity-provider') {
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        if (!(await gate(res, principal, 'identity.manage', now))) return;
        const scope = tenantScopeOf(principal);
        const actor = { tenantId: principal.tenantId, staffMemberId: principal.staffMemberId };

        if (readMethod) {
          return json(res, 200, await withTenantScope(scope, (c) => getIdentityProvider(c, actor.tenantId)));
        }
        if (req.method === 'PUT') {
          const b = await readBody(req);
          return json(res, 200, await withTenantScope(scope, (c) =>
            handleConnectIdentityProvider(c, actor, b, now)));
        }
        if (req.method === 'DELETE') {
          return json(res, 200, await withTenantScope(scope, (c) =>
            handleDisconnectIdentityProvider(c, actor, now)));
        }
        return fail(res, 'not_found');
      }

      // ---- the session, and switching Property (Story 1.3 AC-3) ----
      if (url.pathname === '/v1/auth/session' || url.pathname === '/v1/auth/context') {
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        const scope = tenantScopeOf(principal);

        if (readMethod && url.pathname === '/v1/auth/session') {
          // THE decision point, served to the interface from the same code path that
          // enforces it - so what the console renders and what the server refuses
          // cannot disagree (AD-11). No permission is required to read your own
          // session; being authenticated IS the requirement.
          try {
            return json(res, 200, await withTenantScope(scope, (c) => sessionFor(c, principal, now)));
          } catch (err) {
            if (err instanceof Unauthenticated) return fail(res, 'unauthenticated', { reason: err.message });
            throw err;
          }
        }

        if (req.method === 'POST' && url.pathname === '/v1/auth/context') {
          const b = (await readBody(req)) as { propertyId?: string };
          if (principal.kind === 'fixture') {
            // The stub mints its own scope directly; there is no session row for a
            // switch to be against. Refusing here keeps the fixture path from
            // becoming a second way to obtain a real token.
            return fail(res, 'forbidden', { reason: 'the Story 1.0 fixture credential has no session to switch' });
          }
          const facts = await withTenantScope(scope, (c) =>
            handleSwitchContext(c, toClaims(principal), String(b.propertyId ?? ''), now));
          return json(res, 200, await sessionTokenFor(facts, now));
        }
        return fail(res, 'not_found');
      }

      // ---- defining roles (Story 1.4, FR-81) ----
      // Separate from the /v1/roles read below, because these two are the guarded
      // writes and the read is a picker. `role.define` is TENANT-scope, so a property
      // administrator responsible for one Property cannot define roles for the estate
      // - the same reasoning that puts property.create out of their reach.
      const roleWrite = /^\/v1\/roles\/([^/]+)(\/duplicate)?$/.exec(url.pathname);
      if (roleWrite && (req.method === 'POST' || req.method === 'PATCH')) {
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        if (!(await gate(res, principal, 'role.define', now))) return;
        const scope = tenantScopeOf(principal);
        const actor = {
          tenantId: principal.tenantId, staffMemberId: principal.staffMemberId,
          credentialType: principal.credentialType,
        };
        const key = decodeURIComponent(roleWrite[1] ?? '');
        const body = await readBody(req);

        if (req.method === 'POST' && roleWrite[2]) {
          return json(res, 201, await withTenantScope(scope, (c) =>
            handleDuplicateRole(c, actor, key, body, now)));
        }
        if (req.method === 'PATCH' && !roleWrite[2]) {
          return json(res, 200, await withTenantScope(scope, (c) =>
            handleUpdateRole(c, actor, key, body, now)));
        }
        return fail(res, 'not_found');
      }

      // ---- the role picker, the permission catalogue, and staff invitation ----
      if (url.pathname === '/v1/roles' || url.pathname === '/v1/staff'
          || url.pathname === '/v1/permissions') {
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        const scope = tenantScopeOf(principal);

        if (readMethod && url.pathname === '/v1/roles') {
          if (!(await gate(res, principal, 'role.read', now))) return;
          return json(res, 200, await withTenantScope(scope, (c) => listRoles(c, principal.tenantId)));
        }

        if (readMethod && url.pathname === '/v1/permissions') {
          // THE DEPENDENCY GRAPH, served rather than restated in the console (Story 1.4
          // T1): one graph, one function that reads it, and no hand-written conditional
          // per screen to drift away from the server's answer. It is a catalogue of
          // what this build can do and holds no Tenant data, but it is gated all the
          // same - a permission editor is not a surface a room attendant needs.
          if (!(await gate(res, principal, 'role.read', now))) return;
          return json(res, 200, listPermissions());
        }

        if (req.method === 'POST' && url.pathname === '/v1/staff') {
          // The route-level gate answers "may this caller invite anywhere at all".
          // WHERE they may is decided per (Property, role) pair inside the handler,
          // which is the refusal AC-4 asks to be tested with a crafted payload.
          if (!(await gate(res, principal, 'staff.invite', now))) return;
          const b = await readBody(req);
          const out = await withTenantScope(scope, (c) => handleInviteStaffMember(c, {
            tenantId: principal.tenantId, staffMemberId: principal.staffMemberId,
            credentialType: principal.credentialType,
          }, b, now));
          return json(res, 201, out);
        }

        if (readMethod && url.pathname === '/v1/staff') {
          if (!(await gate(res, principal, 'staff.read', now))) return;
          const propertyId = url.searchParams.get('propertyId') ?? undefined;
          return json(res, 200, await withTenantScope(scope, (c) => listStaffMembers(c, {
            tenantId: principal.tenantId, staffMemberId: principal.staffMemberId,
            credentialType: principal.credentialType,
          }, { ...(propertyId ? { propertyId } : {}) }, now)));
        }
        return fail(res, 'not_found');
      }

      // ---- Tenant-scoped routes (Story 1.2) ----
      // Creating the first Property is the one operation with no Property to be
      // scoped to, so it resolves a TENANT principal. That type is not assignable
      // where a Scope is required, and `withTenantScope` pins only the Tenant - so
      // every cell table's RLS policy, which needs both settings, returns nothing
      // inside these transactions. The isolation gate asserts exactly that.
      if (url.pathname === '/v1/properties' || /^\/v1\/properties\/[^/]+(\/[a-z-]+)?$/.test(url.pathname)) {
        // Story 1.3: these routes now take a REAL session as well as Story 1.0's
        // stub, and every one of them is permission-gated. `property.create` and
        // `property.deactivate` need TENANT-WIDE authority (core/src/staff/roles.ts):
        // a property administrator responsible for the Harbour has no business
        // creating - or retiring - a Property somewhere else in the estate, and AC-4
        // asks for that refusal to be server-side rather than an absent menu item.
        const principal = resolveCellPrincipal(req.headers.authorization, now);
        if (!principal) return fail(res, 'unauthenticated');
        const tenant = tenantScopeOf(principal);

        if (req.method === 'POST' && url.pathname === '/v1/properties') {
          if (!(await gate(res, principal, 'property.create', now))) return;
          const b = (await readBody(req)) as Record<string, unknown>;
          // AC-2, for the caller who sends a region to a creation call it does not
          // belong on... it does belong here, at creation. The refusal that names
          // residency is on the UPDATE paths below.
          const out = await withTenantScope(tenant, (client) => handleCreateProperty(
            client, tenant,
            {
              name: String(b.name ?? ''), region: String(b.region ?? ''),
              timezone: String(b.timezone ?? ''), currency: String(b.currency ?? ''),
            }, new Date()));
          return json(res, 201, out);
        }

        if (readMethod && url.pathname === '/v1/properties') {
          if (!(await gate(res, principal, 'property.read', now))) return;
          return json(res, 200, await withTenantScope(tenant, (c) => listProperties(c, tenant.tenantId)));
        }

        // AC-2's other half: the override has to be visible from the PROPERTY surface
        // as well as the Tenant one, and both render from the same resolution in
        // `core/src/tenant/settings.ts` so they cannot disagree about what is in force.
        const settings = /^\/v1\/properties\/([^/]+)\/settings$/.exec(url.pathname);
        if (settings) {
          const propertyId = decodeURIComponent(settings[1] ?? '');
          if (readMethod) {
            if (!(await gate(res, principal, 'property.read', now))) return;
            return json(res, 200, await withTenantScope(tenant, (c) =>
              getPropertySettings(c, tenant.tenantId, propertyId)));
          }
          if (req.method === 'PATCH') {
            // A PROPERTY-level act, so Property-level authority is enough: requiring
            // Tenant-wide would mean a property administrator could not take a default
            // over for their own Property, which is what an override is for.
            if (!(await gate(res, principal, 'property.settings.write', now))) return;
            const b = await readBody(req);
            return json(res, 200, await withTenantScope(tenant, (c) =>
              handleOverridePropertySettings(c, {
                tenantId: tenant.tenantId, staffMemberId: principal.staffMemberId,
              }, propertyId, b, now)));
          }
          return fail(res, 'not_found');
        }

        const setup = /^\/v1\/properties\/([^/]+)\/setup$/.exec(url.pathname);
        if (readMethod && setup) {
          if (!(await gate(res, principal, 'property.setup.read', now))) return;
          return json(res, 200, await withTenantScope(tenant, (c) =>
            propertySetupState(c, tenant.tenantId, decodeURIComponent(setup[1] ?? ''))));
        }

        const deactivate = /^\/v1\/properties\/([^/]+)\/deactivate$/.exec(url.pathname);
        if (req.method === 'POST' && deactivate) {
          if (!(await gate(res, principal, 'property.deactivate', now))) return;
          return json(res, 200, await withTenantScope(tenant, (c) => handleDeactivateProperty(
            c, tenant, decodeURIComponent(deactivate[1] ?? ''), new Date())));
        }

        // AC-2: there is no route that changes a region, and an attempt to reach
        // one must say WHY rather than answer a bare 404. This is the "direct API
        // call, not only the absent form field" the story asks to be tested.
        const one = /^\/v1\/properties\/([^/]+)$/.exec(url.pathname);
        // DELIBERATELY UNGATED. This operation exists only to refuse a region change
        // with residency named (AC-2). Gating it would answer 403 for a different
        // reason and lose the message the criterion asks for.
        if (one && (req.method === 'PATCH' || req.method === 'PUT')) {
          const b = (await readBody(req)) as { region?: string };
          await withTenantScope(tenant, (c) => assertPropertyRegionUnchanged(
            c, tenant.tenantId, decodeURIComponent(one[1] ?? ''), b.region));
          // Nothing else about a Property is editable in this story: name, timezone
          // and currency changes are not in its criteria, so they are not invented
          // here.
          return fail(res, 'not_found');
        }
        if (readMethod && one) {
          if (!(await gate(res, principal, 'property.read', now))) return;
          const list = await withTenantScope(tenant, (c) => listProperties(c, tenant.tenantId));
          const found = list.find((x) => x.propertyId === decodeURIComponent(one[1] ?? ''));
          if (!found) return fail(res, 'not_found');
          return json(res, 200, found);
        }
        return fail(res, 'not_found');
      }

      // ---- tenancy resolution: the one boundary (AD-3) ----
      // Still demands BOTH a Tenant and a Property. Story 1.3 added a Tenant-scoped
      // session for FR-1's first administrator; it did not soften this. Such a
      // caller is authenticated and simply has no Property context yet, so the
      // answer names the way to get one instead of a bare 401 that reads as a
      // rejected credential.
      const cell = resolveCellPrincipal(req.headers.authorization, now);
      if (!cell) return fail(res, 'unauthenticated');
      if (!cell.propertyId) {
        return fail(res, 'forbidden', {
          reason: 'this session is not scoped to a Property yet: choose one with POST /v1/auth/context',
        });
      }
      const principal: Principal = {
        tenantId: asTenantId(cell.tenantId),
        propertyId: asPropertyId(cell.propertyId),
        staffMemberId: asStaffMemberId(cell.staffMemberId),
      };

      // AC-3: a deactivated Property STOPS ACCEPTING NEW WORK while its records
      // STAY READABLE. Enforced here rather than in each handler, because Jobs
      // (3.1), Room Status (2.1) and everything after them would each have to
      // remember - and the one that forgets is the one that matters. Reads are
      // deliberately unaffected.
      if (!readMethod && !(await propertyAcceptsWrites(principal))) {
        return fail(res, 'forbidden', {
          reason: 'this Property is deactivated: its records remain readable, and it accepts no new work (Story 1.2 AC-3)',
        });
      }

      const route = routes.find((r) => r.method === req.method && r.path.test(url.pathname));
      if (!route) return fail(res, 'not_found');
      await route.handler(req, res, { principal, url });
    } catch (err) {
      if (err instanceof RegionImmutable) return fail(res, 'forbidden', { reason: err.message });
      if (err instanceof Unauthenticated) return fail(res, 'unauthenticated', { reason: err.message });
      if (err instanceof StaffForbidden) return fail(res, 'forbidden', { reason: err.message });
      if (err instanceof StaffNotFound) return fail(res, 'not_found');
      if (err instanceof StaffConflict) return fail(res, 'conflict', { reason: err.message });
      // Story 1.4's guards, each mapped in exactly one place. The escalation refusal
      // NAMES the permission and the dependency refusal names every unmet pair,
      // because "you may not do that" with no subject is a refusal nobody can act on.
      if (err instanceof Escalation) {
        return fail(res, 'forbidden', { reason: err.message, permission: err.permission });
      }
      if (err instanceof DependencyUnmet) {
        return fail(res, 'validation_failed', { reason: err.message, unmet: err.unmet });
      }
      if (err instanceof ShippedRoleImmutable) return fail(res, 'conflict', { reason: err.message });
      // Story 1.5. ONE answer for an unknown Tenant, a Tenant with no connection and an
      // inactive one, so the sign-in route cannot be used to enumerate customers.
      if (err instanceof SsoUnavailable) return fail(res, 'validation_failed', { reason: err.message });
      if (err instanceof SecretUnavailable) {
        // A configuration fault, not a caller's fault, and the message names the
        // VARIABLE rather than the secret. 503 because retrying after somebody supplies
        // it is exactly the right thing to do.
        console.error('[identity] a connection references a secret that is not configured');
        return fail(res, 'upstream_unavailable', { reason: err.message });
      }
      if (err instanceof RoleKeyTaken) return fail(res, 'conflict', { reason: err.message });
      if (err instanceof PropertyConflict) return fail(res, 'conflict', { reason: err.message });
      if (err instanceof PropertyNotFound) return fail(res, 'not_found');
      if (err instanceof ValidationError) return fail(res, 'validation_failed', { reason: err.message });
      console.error('[edge] unhandled', err);
      if (!res.headersSent) fail(res, 'internal');
    }
  });
}
