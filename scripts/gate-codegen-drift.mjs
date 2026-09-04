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
import { parse as parseYaml } from 'yaml';
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

// 3. Every declared error code has a message in EVERY language.
//    contracts/ is one contract, not several: an envelope code with no
//    `error.<code>` key renders a BLANK label at the moment something has already
//    gone wrong. This check was added with the auth contract, and it immediately
//    found `conflict` and `internal` untranslated in both languages - declared
//    since Story 1.0 and never rendered because nothing had raised them yet.
{
  const env = JSON.parse(readFileSync(join('contracts', 'errors', 'envelope.json'), 'utf8'));
  const codes = env.properties.code.enum;
  const locales = readdirSync(join('contracts', 'locale')).filter((f) => f.endsWith('.json'));
  const gaps = [];
  const keysets = new Map();
  for (const f of locales) {
    const dict = JSON.parse(readFileSync(join('contracts', 'locale', f), 'utf8'));
    keysets.set(f, Object.keys(dict).sort().join(','));
    for (const code of codes) {
      const key = `error.${code}`;
      if (!dict[key]) gaps.push(`${f}: missing ${key}`);
    }
  }
  // And the languages agree on their key set, so a key added in English cannot
  // silently ship untranslated (AD-12: Arabic is a release language, not a later port).
  const distinct = new Set(keysets.values());
  if (distinct.size > 1) {
    for (const [f, keys] of keysets) gaps.push(`${f}: key set differs (${keys.split(',').length} keys)`);
  }
  if (gaps.length) {
    failed = true;
    console.log('  codegen-drift  FAIL  localisation contract incomplete:');
    for (const g of gaps) console.log(`                       ${g}`);
  } else {
    console.log(`  codegen-drift  PASS  ${codes.length} error codes translated in ${locales.length} languages`);
  }
}

// 4. The two OpenAPI documents describe two SURFACES, and must not bleed together.
//    FR-1 puts Tenant creation on a Jazzware-internal surface the product does not
//    link to; AD-4 puts the control plane outside the regional cells. If an operator
//    path appears in the cell document, or a cell path in the control-plane document,
//    then FR-1's "provisioning grants Jazzware no standing access to tenant data"
//    stops being enforceable and becomes a promise. Cheap to check, expensive to
//    discover later.
{
  const load = (f) => parseYaml(readFileSync(join('contracts', f), 'utf8'));
  const cell = load('openapi.yaml');
  const control = load('control-plane-openapi.yaml');
  const problems = [];

  const shared = Object.keys(cell.paths).filter((p) => p in control.paths);
  if (shared.length) problems.push(`both documents declare: ${shared.join(', ')}`);

  for (const p of Object.keys(cell.paths)) {
    if (/^\/(operator|tenants)\b/.test(p)) problems.push(`cell document declares an internal path: ${p}`);
  }
  for (const p of Object.keys(control.paths)) {
    if (/^\/(auth|commands|fixture-notes|sla)\b/.test(p)) problems.push(`control-plane document declares a cell path: ${p}`);
  }
  // Separate credentials, not one scheme shared by both surfaces.
  const cellSchemes = Object.keys(cell.components?.securitySchemes ?? {});
  const ctrlSchemes = Object.keys(control.components?.securitySchemes ?? {});
  const bothSchemes = cellSchemes.filter((n) => ctrlSchemes.includes(n));
  if (bothSchemes.length) problems.push(`both documents use the same security scheme: ${bothSchemes.join(', ')}`);

  if (problems.length) {
    failed = true;
    console.log('  codegen-drift  FAIL  the cell and control-plane surfaces have bled together:');
    for (const p of problems) console.log(`                       ${p}`);
  } else {
    console.log(`  codegen-drift  PASS  cell and control-plane documents stay separate (${Object.keys(cell.paths).length} + ${Object.keys(control.paths).length} paths, no overlap)`);
  }
}

process.exit(failed ? 1 : 0);
