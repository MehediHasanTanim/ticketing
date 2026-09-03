#!/usr/bin/env node
/**
 * GATE (AC-3, AD-14): the SLA fold's fixture vectors run in BOTH languages and
 * both runs gate the release.
 *
 * "the build fails if either is absent or disagrees" - so a missing Dart toolchain
 * is a RED gate, not a skipped one. A gate that quietly skips half its job is the
 * exact failure this story exists to prevent.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const vectorsPath = 'contracts/sla-fixtures/vectors.json';
const doc = JSON.parse(readFileSync(vectorsPath, 'utf8'));
let failed = false;

// --only=ts | --only=dart runs one half. Used by scripts/negative-controls.sh so
// that breaking one implementation proves THAT half can go red, rather than being
// masked by the other half already failing. The default runs both, as AD-14 requires.
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : 'both';

// ---------------------------- TypeScript half ----------------------------
if (only === 'both' || only === 'ts') {
const ts = spawnSync('npx', ['--no-install', 'tsx', 'scripts/run-ts-fixtures.ts'],
  { encoding: 'utf8' });
process.stdout.write(ts.stdout ?? '');
if (ts.status !== 0) { failed = true; process.stderr.write(ts.stderr ?? ''); }
}

// ------------------------------- Dart half -------------------------------
if (only === 'both' || only === 'dart') {
const dartFound = spawnSync('dart', ['--version'], { encoding: 'utf8' }).status === 0;
if (!dartFound) {
  failed = true;
  console.log('  dart  FAIL  Dart SDK not found on PATH.');
  console.log('              AD-14 requires BOTH implementations to execute these');
  console.log('              vectors. This gate is RED by design rather than');
  console.log('              skipping - see the story Dev Agent Record.');
} else if (!existsSync('clients/mobile/bin/sla_fixtures.dart')) {
  failed = true;
  console.log('  dart  FAIL  clients/mobile/bin/sla_fixtures.dart is missing.');
} else {
  const dart = spawnSync('dart', ['run', 'clients/mobile/bin/sla_fixtures.dart', vectorsPath],
    { encoding: 'utf8' });
  process.stdout.write(dart.stdout ?? '');
  if (dart.status !== 0) { failed = true; process.stderr.write(dart.stderr ?? ''); }
}
}

console.log(`  vectors: ${doc.vectors.length}, foldVersion ${doc.foldVersion}`);
process.exit(failed ? 1 : 0);
