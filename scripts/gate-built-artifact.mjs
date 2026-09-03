#!/usr/bin/env node
/**
 * GATE: the BUILT artifact actually runs.
 *
 * WHY THIS EXISTS. Story 1.0 shipped with `@core/*`-style tsconfig path aliases.
 * Those are compile-time only - `tsc` does not rewrite them in the emitted
 * JavaScript - so `node dist/edge/src/main.js` failed with MODULE_NOT_FOUND while
 * all 29 tests passed, because vitest resolved the aliases itself. The built
 * artifact had NEVER been executed. The first thing to run it was the API
 * container, which crash-looped on start.
 *
 * Tests that import TypeScript prove the source is correct. They do not prove the
 * thing you ship starts. This gate closes that gap without needing Docker, so it
 * runs on every commit rather than only where a registry is reachable.
 */
import { spawn, execFileSync } from 'node:child_process';

const PORT = process.env.GATE_PORT ?? '39917';
const fail = (m) => { console.log(`  built-artifact  FAIL  ${m}`); process.exit(1); };
const ok = (m) => console.log(`  built-artifact  PASS  ${m}`);

try {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  ok('tsc build clean');
} catch (err) {
  fail(`build failed:\n${String(err.stdout ?? err.stderr ?? err.message).slice(0, 800)}`);
}

const child = spawn('node', ['dist/edge/src/main.js'], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
child.stderr.on('data', (d) => { stderr += d.toString(); });
child.on('exit', (code, signal) => {
  if (code !== 0 && signal === null) fail(`the built artifact exited early with code ${code}\n${stderr.slice(0, 800)}`);
});

const deadline = Date.now() + 15_000;
let health;
while (Date.now() < deadline) {
  if (child.exitCode !== null) fail(`process died before serving:\n${stderr.slice(0, 800)}`);
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/v1/health`);
    health = await res.json();
    break;
  } catch { await new Promise((r) => setTimeout(r, 300)); }
}
if (!health) { child.kill('SIGKILL'); fail(`no response on :${PORT} within 15s\n${stderr.slice(0, 800)}`); }
ok(`dist/edge/src/main.js serves /v1/health (${JSON.stringify(health)})`);

if (health.eventStore !== 'ok') console.log(`  built-artifact  ----  event store is ${health.eventStore}; the gate only requires the process to serve`);

// It must also SHUT DOWN cleanly, because an orchestrator sends SIGTERM and then kills.
const exited = new Promise((resolve) => child.once('exit', (c, s) => resolve({ c, s })));
child.kill('SIGTERM');
const raced = await Promise.race([exited, new Promise((r) => setTimeout(() => r(null), 12_000))]);
if (!raced) { child.kill('SIGKILL'); fail('did not exit within 12s of SIGTERM - a rolling deploy would drop in-flight requests'); }
if (raced.c !== 0) fail(`exited with code ${raced.c} on SIGTERM, expected 0`);
ok('drains and exits 0 on SIGTERM');
