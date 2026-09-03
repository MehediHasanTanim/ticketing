import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { foldSla, SLA_FOLD_VERSION } from '../../core/src/job/sla';

const doc = JSON.parse(readFileSync('contracts/sla-fixtures/vectors.json', 'utf8'));

describe('the one SLA fold (AD-14)', () => {
  it('declares the same foldVersion as the vectors', () => {
    expect(doc.foldVersion).toBe(SLA_FOLD_VERSION);
  });

  for (const v of doc.vectors) {
    it(`vector: ${v.name}`, () => {
      const got = foldSla({ events: v.events, targetMinutes: v.targetMinutes, now: v.now });
      expect(got.elapsedMs).toBe(v.expect.elapsedMs);
      expect(got.pausedMs).toBe(v.expect.pausedMs);
      expect(got.remainingMs).toBe(v.expect.remainingMs);
      expect(got.breached).toBe(v.expect.breached);
    });
  }

  it('rejects an invalid instant rather than silently treating it as epoch', () => {
    expect(() => foldSla({
      events: [{ type: 'JobLogged', occurredAt: 'not-a-date' }],
      targetMinutes: 30, now: '2026-09-02T10:00:00.000Z',
    })).toThrow(/invalid RFC 3339/);
  });

  it('is pure - the same input twice gives the same output', () => {
    const input = {
      events: [{ type: 'JobLogged' as const, occurredAt: '2026-09-02T10:00:00.000Z' }],
      targetMinutes: 30, now: '2026-09-02T10:10:00.000Z',
    };
    expect(foldSla(input)).toEqual(foldSla(input));
  });

  it('does not mutate the caller\'s event array while ordering it (AD-2)', () => {
    const events = [
      { type: 'JobCompleted' as const, occurredAt: '2026-09-02T10:45:00.000Z' },
      { type: 'JobLogged' as const, occurredAt: '2026-09-02T10:00:00.000Z' },
    ];
    foldSla({ events, targetMinutes: 60, now: '2026-09-02T18:00:00.000Z' });
    expect(events[0]!.type).toBe('JobCompleted');
  });
});
