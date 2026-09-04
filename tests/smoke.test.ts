import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { start, auth, type Harness } from './harness';
import { rebuildProjections } from '../app/src/rebuild-projections';
import { OPENAPI_DOCUMENT } from '../contracts/generated/ts/openapi';
import { CONTROL_PLANE_OPENAPI_DOCUMENT } from '../contracts/generated/ts/control-plane-openapi';

/**
 * AC-5: "it runs" has to be machine-checkable. Health plus one command all the way
 * through edge -> app -> event store -> projection -> read, then a projection
 * rebuild that must reproduce the same state.
 */
describe('cell smoke test', () => {
  let h: Harness;
  beforeAll(async () => { h = await start(); });
  afterAll(async () => { await h?.stop(); });

  it('health reports the API, the event store and the cache', async () => {
    const res = await fetch(`${h.base}/v1/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.api).toBe('ok');
    expect(body.eventStore).toBe('ok');
    expect(body.cache).toBe('ok');
    expect(body.status).toBe('ok');
    expect(body.cell.length).toBeGreaterThan(0);
  });

  it('health never 500s - it reports what is unreachable', async () => {
    // A 500 from health tells a property administrator nothing except that the
    // thing they used to ask what is wrong is also broken. Observed for real when
    // the built artifact ran on a machine with no datastore configuration.
    const saved = { db: process.env.DATABASE_URL_APP, redis: process.env.REDIS_URL };
    try {
      delete process.env.DATABASE_URL_APP;
      process.env.REDIS_URL = 'redis://127.0.0.1:1';
      const { closePool } = await import('../adapters/src/postgres/pool');
      await closePool();
      const res = await fetch(`${h.base}/v1/health`);
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, string>;
      expect(body.status).toBe('degraded');
      expect(body.api).toBe('ok');
      expect(body.eventStore).toBe('unreachable');
      expect(body.cache).toBe('unreachable');
    } finally {
      if (saved.db) process.env.DATABASE_URL_APP = saved.db;
      if (saved.redis) process.env.REDIS_URL = saved.redis;
      const { closePool } = await import('../adapters/src/postgres/pool');
      await closePool();
    }
  });

  it('a command returns the accepted event and reaches the projection', async () => {
    const text = `smoke ${Date.now()}`;
    const post = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
      method: 'POST', headers: auth(h.tokenA), body: JSON.stringify({ text }),
    });
    expect(post.status).toBe(202);
    const accepted = await post.json() as Record<string, string>;
    // Commands are POSTs returning the accepted event (Consistency Conventions).
    expect(accepted.type).toBe('FixtureNoteRecorded');
    expect(accepted.eventId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ULID
    expect(new Date(accepted.occurredAt).toString()).not.toBe('Invalid Date');
    expect(new Date(accepted.recordedAt).toString()).not.toBe('Invalid Date');

    const read = await fetch(`${h.base}/v1/fixture-notes/${accepted.noteId}`, { headers: auth(h.tokenA) });
    expect(read.status).toBe(200);
    expect((await read.json() as { text: string }).text).toBe(text);
  });

  it('is idempotent on the same client key (AD-7, person-scoped)', async () => {
    const body = JSON.stringify({ text: 'idempotent once', clientKey: `k-${Date.now()}` });
    const first = await (await fetch(`${h.base}/v1/commands/record-fixture-note`,
      { method: 'POST', headers: auth(h.tokenA), body })).json() as { eventId: string; noteId: string };
    const second = await (await fetch(`${h.base}/v1/commands/record-fixture-note`,
      { method: 'POST', headers: auth(h.tokenA), body })).json() as { eventId: string; noteId: string };
    expect(second.eventId).toBe(first.eventId);
    expect(second.noteId).toBe(first.noteId);
  });

  it('refuses an invalid command with the one error envelope', async () => {
    const res = await fetch(`${h.base}/v1/commands/record-fixture-note`, {
      method: 'POST', headers: auth(h.tokenA), body: JSON.stringify({ text: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string; messageKey: string; retryable: boolean };
    expect(body).toMatchObject({ code: 'validation_failed', messageKey: 'error.validation_failed', retryable: false });
  });

  it('serves the fold over HTTP so the console reads the same numbers as the handset', async () => {
    const res = await fetch(`${h.base}/v1/sla/preview`, {
      method: 'POST', headers: auth(h.tokenA),
      body: JSON.stringify({
        events: [{ type: 'JobLogged', occurredAt: '2026-09-02T10:00:00.000Z' }],
        targetMinutes: 30, now: '2026-09-02T10:30:00.001Z',
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ elapsedMs: 1800001, breached: true, foldVersion: 1 });
  });

  it('serves its own OpenAPI document, generated from contracts/', async () => {
    const res = await fetch(`${h.base}/v1/openapi.json`);
    expect(res.status).toBe(200);
    const doc = await res.json() as {
      openapi: string; paths: Record<string, unknown>;
      components: { securitySchemes: Record<string, unknown> };
      security: unknown;
    };
    expect(doc.openapi).toMatch(/^3\.1/);
    // The spec is the schema of record; the served document must be the same one
    // the TypeScript and Dart bindings are generated from, not a second description
    // assembled from decorated controllers.
    const onDisk = JSON.parse(JSON.stringify(
      (await import('../contracts/generated/ts/openapi')).OPENAPI_DOCUMENT));
    expect(doc).toEqual(onDisk);
    // Every real endpoint must be documented as requiring a credential, or
    // "Try it out" teaches the reader the wrong thing about the API.
    expect(doc.components.securitySchemes).toHaveProperty('bearerAuth');
    expect(doc.security).toEqual([{ bearerAuth: [] }]);

    // A CLOSED allowlist, asserted in both directions. Opting out of auth is a
    // decision that needs a reason, and the reason belongs next to the name:
    // health and docs carry no tenant data, and the four auth entry points are
    // where a credential is OBTAINED - requiring one there would be circular.
    // Adding a path to the spec with `security: []` and not to this list fails;
    // so does listing a path here that no longer opts out.
    const MAY_BE_PUBLIC = new Set([
      '/health', '/openapi.json', '/docs',
      '/auth/sso/start', '/auth/sso/callback', '/auth/device/sign-in', '/auth/token/refresh',
      // The password fallback: every one of these is how a caller GETS a
      // credential, or proves control of a mailbox in order to set one.
      '/auth/sign-in', '/auth/credential/set-up',
      '/auth/password/forgot', '/auth/password/reset',
      // The second factor's challenge endpoints. The challenge token is NOT a
      // bearer token - it travels in the body with its own audience and no scope -
      // so these carry no session and cannot require one.
      '/auth/mfa/challenge/verify', '/auth/mfa/challenge/resend',
    ]);
    const actuallyPublic = new Set<string>();
    for (const [path, ops] of Object.entries(doc.paths as Record<string, Record<string, { security?: unknown[] }>>)) {
      for (const op of Object.values(ops)) {
        if (op.security === undefined) continue;
        expect(op.security, `${path}: the only reason to set security is to opt out`).toEqual([]);
        actuallyPublic.add(path);
        expect(MAY_BE_PUBLIC.has(path), `${path} opts out of auth and is not on the allowlist`).toBe(true);
      }
    }
    expect([...actuallyPublic].sort()).toEqual([...MAY_BE_PUBLIC].sort());
  });

  it('keeps the control-plane document to its own closed set of public operations', async () => {
    // The internal surface has far fewer reasons to be public than the cell, and
    // the ones it has are exact: how an operator obtains a credential, and its own
    // description. Anything else opting out of `operatorBearerAuth` is a mistake.
    const control = CONTROL_PLANE_OPENAPI_DOCUMENT as unknown as {
      security: unknown; paths: Record<string, Record<string, { security?: unknown[] }>>;
    };
    expect(control.security).toEqual([{ operatorBearerAuth: [] }]);
    const MAY_BE_PUBLIC = new Set(['/operator/sign-in', '/openapi.json', '/docs']);
    const actuallyPublic = new Set<string>();
    for (const [path, ops] of Object.entries(control.paths)) {
      for (const op of Object.values(ops)) {
        if (op.security === undefined) continue;
        expect(op.security, `${path}: the only reason to set security is to opt out`).toEqual([]);
        actuallyPublic.add(path);
      }
    }
    expect([...actuallyPublic].sort()).toEqual([...MAY_BE_PUBLIC].sort());
  });

  it('is honest about what is designed but not built - every unbuilt operation 501s with its story', async () => {
    // The auth surface is designed ahead of the stories that build it
    // (docs/decisions/0002). The risk that creates is a spec that advertises an
    // endpoint the server does not have, so the flag and the runtime are checked
    // against each other rather than trusted separately.
    const doc = OPENAPI_DOCUMENT as unknown as {
      paths: Record<string, Record<string, { 'x-implemented'?: boolean; 'x-story'?: string }>>;
    };
    const unbuilt: Array<{ method: string; path: string; story?: string }> = [];
    for (const [path, ops] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (op['x-implemented'] === false) unbuilt.push({ method, path, story: op['x-story'] });
      }
    }
    // The remaining auth operations, and nothing else - a Story 1.0 operation marked
    // unbuilt would mean something shipped that the spec says does not exist. This
    // number goes DOWN as 1.5, 4.1, 4.8 and Epic 12 land, and changing it is meant to
    // be a deliberate edit rather than a silent one. Twenty until Story 1.3, which
    // built six: /auth/session, /auth/context, /auth/sign-in,
    // /auth/credential/set-up, /auth/password/forgot and /auth/password/reset.
    expect(unbuilt).toHaveLength(14);
    expect(unbuilt.every((o) => o.path.startsWith('/auth/'))).toBe(true);

    // And the converse, which is the assertion that actually bites: an operation
    // NOT marked unbuilt has to be reachable. Flipping `x-implemented` to true
    // without writing the handler stops the stub answering, and the path then
    // falls through to 404 - so a story cannot mark its work done by editing the
    // spec. Limited to parameterless reads, which need no fixture data to exist.
    for (const [path, ops] of Object.entries(doc.paths)) {
      if (path.includes('{')) continue;
      const op = ops['get'] as { 'x-implemented'?: boolean } | undefined;
      if (!op || op['x-implemented'] === false) continue;
      const res = await fetch(`${h.base}/v1${path}`, { headers: auth(h.tokenA) });
      expect([404, 501], `GET ${path} is documented as built but is not there`)
        .not.toContain(res.status);
    }

    for (const { method, path, story } of unbuilt) {
      // An unowned designed-ahead operation is a spec defect: nobody is going to
      // build it, and nothing will ever remove the stub.
      expect(story, `${method} ${path} has no x-story`).toMatch(/^\d+\.\d+$/);

      const url = `${h.base}/v1${path.replace(/\{[^}]+\}/g, 'fixture-id')}`;
      // Both with and without a credential, and the answer is the same: the
      // operation does not exist yet. A 401 here would send the reader looking for
      // a token that was never the problem.
      for (const headers of [undefined, auth(h.tokenA)]) {
        const res = await fetch(url, { method: method.toUpperCase(), ...(headers ? { headers } : {}) });
        expect(res.status, `${method} ${path}`).toBe(501);
        const body = await res.json() as { code: string; messageKey: string; retryable: boolean; details?: { story?: string } };
        expect(body.code).toBe('not_implemented');
        expect(body.messageKey).toBe('error.not_implemented');
        // Retrying does not build the feature.
        expect(body.retryable).toBe(false);
        expect(body.details?.story, `${method} ${path} must name its owner`).toBe(story);
      }
    }
  });

  it('keeps the cell and the control plane apart, and serves only the cell', async () => {
    // FR-1 puts Tenant creation on a Jazzware-internal surface the product does not
    // link to, and AD-4 puts the control plane outside the regional cells. The
    // drift gate checks the two DOCUMENTS do not overlap; this checks the running
    // cell does not serve the internal one, which is the half a document cannot
    // prove about itself.
    const cell = OPENAPI_DOCUMENT as unknown as { paths: Record<string, unknown> };
    const control = CONTROL_PLANE_OPENAPI_DOCUMENT as unknown as {
      paths: Record<string, unknown>;
      servers: Array<{ url: string }>;
      components: { securitySchemes: Record<string, unknown> };
    };

    // Separate credential, not one scheme shared by both surfaces: an operator
    // token must be structurally unusable against a cell, not merely unauthorised.
    expect(Object.keys(control.components.securitySchemes)).toEqual(['operatorBearerAuth']);

    // RESOLVED urls, not path templates. Both surfaces legitimately declare
    // `/docs` and `/openapi.json` - each documents itself - and those are
    // different URLs because the two documents carry different `servers`
    // prefixes. This assertion compared templates at first and failed on exactly
    // that, correctly: what matters is that no URL is served by both, and that
    // the prefixes which make them distinct are actually distinct.
    const cellPrefix = (cell as unknown as { servers: Array<{ url: string }> }).servers[0]?.url ?? '';
    const ctrlPrefix = control.servers[0]?.url ?? '';
    expect(cellPrefix).toBe('/v1');
    expect(ctrlPrefix).not.toBe(cellPrefix);
    const cellUrls = new Set(Object.keys(cell.paths).map((p) => cellPrefix + p));
    for (const path of Object.keys(control.paths)) {
      expect(cellUrls, `${ctrlPrefix}${path} is also served by the cell`).not.toContain(ctrlPrefix + path);
    }
    // And the sharper version: no operator or provisioning path in the cell
    // document at all, whatever prefix it might be given.
    expect(Object.keys(cell.paths).filter((p) => /^\/(operator|tenants)\b/.test(p))).toEqual([]);

    // And the cell serves none of it - not a 501 either, because a 501 would say
    // "coming here soon", which is the opposite of what AD-4 decided.
    for (const path of ['/v1/operator/sign-in', '/v1/operator/session', '/v1/tenants']) {
      for (const method of ['GET', 'POST']) {
        const res = await fetch(`${h.base}${path}`, {
          method, headers: auth(h.tokenA), ...(method === 'POST' ? { body: '{}' } : {}),
        });
        expect(res.status, `${method} ${path}`).toBe(404);
      }
    }
  });

  it('does not 501 a path that merely resembles an unbuilt one', async () => {
    // `/auth/sessions/{sessionId}` is a DELETE. The matcher must not swallow the
    // sibling collection, a different method, or a deeper path.
    // 404, not 501: these are not documented operations, so they are not
    // "designed and pending" - they are simply absent, and saying otherwise would
    // promise a reader that something is coming.
    const cases: Array<[string, string, number]> = [
      ['GET', '/v1/auth/sessions/some-id', 404],  // only DELETE is documented on the item
      ['DELETE', '/v1/auth/sessions', 404],       // only GET is documented on the collection
      ['GET', '/v1/auth/sessions/a/b', 404],      // deeper than the template
      ['GET', '/v1/auth/sessions', 501],          // ...while the documented one still 501s
      ['GET', '/v1/fixture-notes', 200],          // and a real, built route still works
    ];
    for (const [method, path, expected] of cases) {
      const res = await fetch(`${h.base}${path}`, { method, headers: auth(h.tokenA) });
      expect(res.status, `${method} ${path}`).toBe(expected);
    }
  });

  it('serves Swagger UI locally - no CDN, and only the assets the page needs', async () => {
    const page = await fetch(`${h.base}/v1/docs`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(page.headers.get('content-security-policy')).toContain("default-src 'none'");
    // A third-party script tag on an origin that also serves authenticated
    // endpoints is the thing self-hosting avoids.
    expect(html).not.toMatch(/https?:\/\/(unpkg|cdn|jsdelivr)/i);
    expect(html).toContain('./docs/assets/swagger-ui-bundle.js');
    expect(html).toContain("url: './openapi.json'");

    for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js']) {
      const res = await fetch(`${h.base}/v1/docs/assets/${asset}`);
      expect(res.status, asset).toBe(200);
    }
    // Everything else in the package stays unreachable.
    for (const blocked of ['index.js', 'absolute-path.js', 'package.json', 'swagger-ui-es-bundle.js']) {
      const res = await fetch(`${h.base}/v1/docs/assets/${blocked}`);
      expect(res.status, blocked).toBe(404);
    }
  });

  it('HEAD works wherever GET does on the public routes', async () => {
    for (const path of ['/v1/health', '/v1/openapi.json', '/v1/docs']) {
      const res = await fetch(`${h.base}${path}`, { method: 'HEAD' });
      expect(res.status, path).toBe(200);
    }
  });

  it('API_DOCS=0 makes the docs routes 404, not 401', async () => {
    const saved = process.env.API_DOCS;
    try {
      process.env.API_DOCS = '0';
      for (const path of ['/v1/docs', '/v1/openapi.json', '/v1/docs/assets/swagger-ui.css']) {
        const res = await fetch(`${h.base}${path}`);
        expect(res.status, path).toBe(404);
        }
      // Health is unaffected - it is not a docs route.
      expect((await fetch(`${h.base}/v1/health`)).status).toBe(200);
    } finally {
      if (saved === undefined) delete process.env.API_DOCS; else process.env.API_DOCS = saved;
    }
  });

  it('rebuilds every projection from the event log and reproduces the same state', async () => {
    const before = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) })).json();
    const result = await rebuildProjections();
    expect(result.events).toBeGreaterThan(0);
    const after = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) })).json();
    expect(after).toEqual(before);
    console.log(`      rebuild: ${result.notes} rows from ${result.events} events in ${result.ms}ms`);
  });
});
