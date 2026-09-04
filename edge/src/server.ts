import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { getPool, withScope } from '../../adapters/src/postgres/pool';
import { pingRedis } from '../../adapters/src/cache/redis-probe';
import { cellName } from '../../adapters/src/postgres/config';
import { byId, list } from '../../adapters/src/postgres/fixture-note-read-model';
import { handleRecordFixtureNote } from '../../app/src/record-fixture-note';
import { systemClock } from '../../app/src/clock';
import { foldSla } from '../../core/src/job';
import { ValidationError } from '../../core/src/fixture/note';
import { resolvePrincipal, resolveTenantPrincipal, type Principal } from './auth';
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

      // ---- Tenant-scoped routes (Story 1.2) ----
      // Creating the first Property is the one operation with no Property to be
      // scoped to, so it resolves a TENANT principal. That type is not assignable
      // where a Scope is required, and `withTenantScope` pins only the Tenant - so
      // every cell table's RLS policy, which needs both settings, returns nothing
      // inside these transactions. The isolation gate asserts exactly that.
      if (url.pathname === '/v1/properties' || /^\/v1\/properties\/[^/]+(\/[a-z-]+)?$/.test(url.pathname)) {
        const tenant = resolveTenantPrincipal(req.headers.authorization);
        if (!tenant) return fail(res, 'unauthenticated');

        if (req.method === 'POST' && url.pathname === '/v1/properties') {
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
          return json(res, 200, await withTenantScope(tenant, (c) => listProperties(c, tenant.tenantId)));
        }

        const setup = /^\/v1\/properties\/([^/]+)\/setup$/.exec(url.pathname);
        if (readMethod && setup) {
          return json(res, 200, await withTenantScope(tenant, (c) =>
            propertySetupState(c, tenant.tenantId, decodeURIComponent(setup[1] ?? ''))));
        }

        const deactivate = /^\/v1\/properties\/([^/]+)\/deactivate$/.exec(url.pathname);
        if (req.method === 'POST' && deactivate) {
          return json(res, 200, await withTenantScope(tenant, (c) => handleDeactivateProperty(
            c, tenant, decodeURIComponent(deactivate[1] ?? ''), new Date())));
        }

        // AC-2: there is no route that changes a region, and an attempt to reach
        // one must say WHY rather than answer a bare 404. This is the "direct API
        // call, not only the absent form field" the story asks to be tested.
        const one = /^\/v1\/properties\/([^/]+)$/.exec(url.pathname);
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
          const list = await withTenantScope(tenant, (c) => listProperties(c, tenant.tenantId));
          const found = list.find((x) => x.propertyId === decodeURIComponent(one[1] ?? ''));
          if (!found) return fail(res, 'not_found');
          return json(res, 200, found);
        }
        return fail(res, 'not_found');
      }

      // ---- tenancy resolution: the one boundary (AD-3) ----
      const principal = resolvePrincipal(req.headers.authorization);
      if (!principal) return fail(res, 'unauthenticated');

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
      if (err instanceof PropertyConflict) return fail(res, 'conflict', { reason: err.message });
      if (err instanceof PropertyNotFound) return fail(res, 'not_found');
      if (err instanceof ValidationError) return fail(res, 'validation_failed', { reason: err.message });
      console.error('[edge] unhandled', err);
      if (!res.headersSent) fail(res, 'internal');
    }
  });
}
