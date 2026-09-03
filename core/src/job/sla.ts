/**
 * THE SLA fold (AD-14). One implementation for server and console; exactly one
 * Dart port exists for the offline handset because Dart cannot import TypeScript.
 * There is no third implementation anywhere, in any language, ever - and no SQL
 * computes elapsed time.
 *
 * Story 1.0 implements the TRIVIAL ELAPSED CASE ONLY, which is all the fixture
 * vectors require. Pause semantics (3.7), reassignment (3.5) and the offline
 * breach (3.8) EXTEND this function; they must never replace it or fork it.
 *
 * Behaviour is fixed by contracts/sla-fixtures/vectors.json, executed by both
 * languages as a release gate.
 */

export const SLA_FOLD_VERSION = 1;

export type JobClockEventType = 'JobLogged' | 'JobCompleted';

export interface JobClockEvent {
  readonly type: JobClockEventType;
  /** The domain clock (AD-2). The fold orders by this, never by arrival. */
  readonly occurredAt: string;
}

export interface SlaSnapshot {
  readonly elapsedMs: number;
  readonly pausedMs: number;
  readonly remainingMs: number;
  readonly breached: boolean;
  readonly foldVersion: number;
}

export interface SlaInput {
  readonly events: readonly JobClockEvent[];
  readonly targetMinutes: number;
  /** Evaluation instant. Comes from ClockPort, never from Date.now() inside core. */
  readonly now: string;
}

const ms = (iso: string): number => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new Error(`invalid RFC 3339 instant: ${iso}`);
  return t;
};

export function foldSla(input: SlaInput): SlaSnapshot {
  const targetMs = input.targetMinutes * 60_000;

  // AD-2: order by the domain clock. Arrival order is not causal order, because
  // an action taken offline arrives late carrying an earlier occurredAt.
  const ordered = [...input.events].sort((a, b) => ms(a.occurredAt) - ms(b.occurredAt));

  const logged = ordered.find((e) => e.type === 'JobLogged');
  if (!logged) {
    // The clock has not started. Not breached, nothing elapsed.
    return { elapsedMs: 0, pausedMs: 0, remainingMs: targetMs, breached: false,
             foldVersion: SLA_FOLD_VERSION };
  }

  const completed = ordered.find((e) => e.type === 'JobCompleted');
  const start = ms(logged.occurredAt);
  const end = completed ? ms(completed.occurredAt) : ms(input.now);

  const elapsedMs = Math.max(0, end - start);

  // pausedMs is structurally present and always 0 at foldVersion 1. Story 3.7
  // computes it from pause events and adds its vectors; every reader already
  // consumes this field, so no caller changes when it starts moving.
  const pausedMs = 0;

  const measuredMs = elapsedMs - pausedMs;
  return {
    elapsedMs,
    pausedMs,
    remainingMs: targetMs - measuredMs,
    breached: measuredMs > targetMs,
    foldVersion: SLA_FOLD_VERSION,
  };
}
