import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { start, auth, type Harness } from './harness';
import { rebuildProjections } from '../app/src/rebuild-projections';

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

  it('rebuilds every projection from the event log and reproduces the same state', async () => {
    const before = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) })).json();
    const result = await rebuildProjections();
    expect(result.events).toBeGreaterThan(0);
    const after = await (await fetch(`${h.base}/v1/fixture-notes`, { headers: auth(h.tokenA) })).json();
    expect(after).toEqual(before);
    console.log(`      rebuild: ${result.notes} rows from ${result.events} events in ${result.ms}ms`);
  });
});
