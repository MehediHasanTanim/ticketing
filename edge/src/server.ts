import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { getPool, withScope } from '../../adapters/src/postgres/pool';
import { pingRedis } from '../../adapters/src/cache/redis-probe';
import { cellName } from '../../adapters/src/postgres/config';
import { byId, list } from '../../adapters/src/postgres/fixture-note-read-model';
import { handleRecordFixtureNote } from '../../app/src/record-fixture-note';
import { systemClock } from '../../app/src/clock';
import { foldSla } from '../../core/src/job';
import { ValidationError } from '../../core/src/fixture/note';
import { resolvePrincipal, type Principal } from './auth';
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

export function createApp(): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      // Health is the only unauthenticated route.
      if (req.method === 'GET' && url.pathname === '/v1/health') {
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

      // ---- tenancy resolution: the one boundary (AD-3) ----
      const principal = resolvePrincipal(req.headers.authorization);
      if (!principal) return fail(res, 'unauthenticated');

      const route = routes.find((r) => r.method === req.method && r.path.test(url.pathname));
      if (!route) return fail(res, 'not_found');
      await route.handler(req, res, { principal, url });
    } catch (err) {
      if (err instanceof ValidationError) return fail(res, 'validation_failed', { reason: err.message });
      console.error('[edge] unhandled', err);
      if (!res.headersSent) fail(res, 'internal');
    }
  });
}
