#!/usr/bin/env node
/**
 * GATE (AC-2): contracts/ is the schema of record.
 *
 * Fails if a generated file differs from what contracts/ produces - whether it went
 * stale because someone edited the source and forgot to regenerate, or because
 * someone hand-edited the generated output - and if a wire type is hand-written
 * outside contracts/generated/.
 *
 * NOTE ON A BUG THIS GATE ONCE HAD. The first version ran codegen and then diffed
 * with git. That silently DESTROYED a hand-edit before comparing it, so it caught
 * stale output but not hand-edited output. Story 1.0's negative control (AC-6)
 * found it. The fix is to snapshot the committed content in memory BEFORE
 * regenerating and compare against the snapshot, which needs no git state at all.
 * This is the whole argument for AC-6: a gate that has never gone red is not known
 * to work.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const GENERATED = join('contracts', 'generated');

const walk = (dir, out = []) => {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

let failed = false;

// 1. Snapshot what is committed, regenerate, compare content.
const before = new Map(walk(GENERATED).map((f) => [f, readFileSync(f, 'utf8')]));
execFileSync('npm', ['run', '--silent', 'codegen'], { encoding: 'utf8' });
const after = new Map(walk(GENERATED).map((f) => [f, readFileSync(f, 'utf8')]));

const changed = [];
for (const [f, content] of after) {
  if (!before.has(f)) changed.push(`${f} (was not committed)`);
  else if (before.get(f) !== content) changed.push(`${f} (content differs)`);
}
for (const f of before.keys()) if (!after.has(f)) changed.push(`${f} (no longer generated)`);

if (changed.length) {
  failed = true;
  console.log('  codegen-drift  FAIL  generated bindings are stale or hand-edited:');
  for (const c of changed) console.log(`                       ${relative('.', c)}`);
  console.log('                       run `npm run codegen` and commit the result');
} else {
  console.log(`  codegen-drift  PASS  ${after.size} generated bindings match contracts/`);
}

// 2. No hand-written wire types outside generated/.
//    Deliberately narrow and documented: a wire type is a declaration whose name
//    ends in Dto/Payload/ApiResponse/ApiRequest/ApiType. Domain types are not wire
//    types and are unaffected.
const SUSPECT = /\b(?:interface|type)\s+([A-Za-z0-9_]*(?:Dto|Payload|ApiResponse|ApiRequest|ApiType))\b/g;
const skip = /node_modules|contracts[\/\\]generated|dist|\.dart_tool/;
const offenders = [];
for (const root of ['core', 'app', 'adapters', 'edge', 'clients']) {
  for (const f of walk(root)) {
    if (skip.test(f) || !/\.(ts|tsx|dart)$/.test(f)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(SUSPECT)) offenders.push(`${f}: ${m[1]}`);
  }
}
if (offenders.length) {
  failed = true;
  console.log('  codegen-drift  FAIL  hand-written wire types outside contracts/generated:');
  for (const o of offenders) console.log(`                       ${o}`);
} else {
  console.log('  codegen-drift  PASS  no hand-written wire types outside contracts/generated');
}

process.exit(failed ? 1 : 0);
