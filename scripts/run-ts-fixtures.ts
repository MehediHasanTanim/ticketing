/** The TypeScript half of AD-14's gate. */
import { readFileSync } from 'node:fs';
import { foldSla, SLA_FOLD_VERSION } from '../core/src/job/sla';

interface Vector {
  name: string; targetMinutes: number; now: string;
  events: Array<{ type: 'JobLogged' | 'JobCompleted'; occurredAt: string }>;
  expect: { elapsedMs: number; pausedMs: number; remainingMs: number; breached: boolean };
}

const doc = JSON.parse(readFileSync('contracts/sla-fixtures/vectors.json', 'utf8')) as {
  foldVersion: number; vectors: Vector[];
};

if (doc.foldVersion !== SLA_FOLD_VERSION) {
  console.error(`FAIL foldVersion: vectors declare ${doc.foldVersion}, TS fold is ${SLA_FOLD_VERSION}`);
  process.exit(1);
}

let failures = 0;
for (const v of doc.vectors) {
  const got = foldSla({ events: v.events, targetMinutes: v.targetMinutes, now: v.now });
  const diffs: string[] = [];
  const cmp = (n: string, a: unknown, b: unknown): void => {
    if (a !== b) diffs.push(`${n}: got ${String(a)}, want ${String(b)}`);
  };
  cmp('elapsedMs', got.elapsedMs, v.expect.elapsedMs);
  cmp('pausedMs', got.pausedMs, v.expect.pausedMs);
  cmp('remainingMs', got.remainingMs, v.expect.remainingMs);
  cmp('breached', got.breached, v.expect.breached);
  if (diffs.length === 0) console.log(`  ts    PASS  ${v.name}`);
  else { failures++; console.log(`  ts    FAIL  ${v.name}`); diffs.forEach((d) => console.log(`              ${d}`)); }
}
if (failures > 0) {
  console.error(`TypeScript fold disagrees with ${failures} vector(s) - AD-14 violated`);
  process.exit(1);
}
console.log(`  ts    ${doc.vectors.length} vectors passed (foldVersion ${SLA_FOLD_VERSION})`);
