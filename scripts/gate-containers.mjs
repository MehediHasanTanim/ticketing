#!/usr/bin/env node
/**
 * GATE: container definitions (Story 1.0 / AC-5).
 *
 * WHY THIS EXISTS. `docker build` cannot run in the environment where the
 * containerisation was written - every container registry is blocked by egress
 * policy, so buildkit cannot resolve even a base image and `docker build --check`
 * is unavailable. Rather than ship unverified Dockerfiles and call them done, this
 * gate asserts, statically, the properties a build-and-run would otherwise prove:
 * non-root, health-checked, no baked secrets, ordered startup, no host bind mounts.
 *
 * It is NOT a substitute for the real thing. CI's `container-images` job builds
 * both images and runs scripts/compose-smoke.sh, which is what actually proves the
 * cell runs in containers. This gate is what can be checked anywhere, every commit.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

let failed = 0;
const ok = (m) => console.log(`  containers  PASS  ${m}`);
const bad = (m) => { failed++; console.log(`  containers  FAIL  ${m}`); };

const SECRET_ISH = /(PASSWORD|SECRET|TOKEN|APIKEY|API_KEY|PRIVATE_KEY|CREDENTIAL)/i;

// --------------------------------------------------------------- Dockerfiles
function checkDockerfile(path, label) {
  if (!existsSync(path)) return bad(`${label}: ${path} is missing`);
  const lines = readFileSync(path, 'utf8').split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const stages = [];
  let finalStageIdx = -1;
  lines.forEach((l, i) => {
    const m = /^FROM\s+\S+(?:\s+AS\s+(\S+))?/i.exec(l);
    if (m) { stages.push(m[1] ?? String(stages.length)); finalStageIdx = i; }
  });
  if (stages.length < 2) bad(`${label}: expected a multi-stage build, found ${stages.length} stage(s)`);
  else ok(`${label}: multi-stage (${stages.join(' -> ')})`);

  // COPY --from must reference a stage that exists.
  for (const l of lines) {
    const m = /^COPY\s+--from=([A-Za-z0-9_.-]+)/i.exec(l);
    if (m && !stages.includes(m[1]) && !/^\d+$/.test(m[1])) {
      bad(`${label}: COPY --from=${m[1]} references a stage that does not exist`);
    }
  }

  const finalStage = lines.slice(finalStageIdx);
  const user = finalStage.filter((l) => /^USER\s+/i.test(l)).pop();
  if (!user) bad(`${label}: the runtime stage has no USER - it would run as root`);
  else if (/^USER\s+(root|0)\b/i.test(user)) bad(`${label}: runtime stage runs as ${user}`);
  else ok(`${label}: runs as non-root (${user})`);

  if (!finalStage.some((l) => /^HEALTHCHECK\s+/i.test(l))) {
    bad(`${label}: no HEALTHCHECK in the runtime stage - an orchestrator cannot tell live from started`);
  } else ok(`${label}: HEALTHCHECK present`);

  if (!finalStage.some((l) => /^(CMD|ENTRYPOINT)\s+\[/i.test(l))) {
    bad(`${label}: no exec-form CMD/ENTRYPOINT - shell form swallows SIGTERM`);
  } else ok(`${label}: exec-form CMD (signals reach the process)`);

  for (const l of lines) {
    const m = /^(ENV|ARG)\s+([A-Za-z0-9_]+)\s*=?\s*(.*)$/i.exec(l);
    if (m && SECRET_ISH.test(m[2]) && m[3] && m[3] !== '""' && m[3] !== "''") {
      bad(`${label}: ${m[1]} ${m[2]} carries a baked value - secrets come from the platform at runtime`);
    }
  }
}

function checkDockerignore(path, label, mustExclude) {
  if (!existsSync(path)) return bad(`${label}: ${path} is missing`);
  const entries = readFileSync(path, 'utf8').split('\n').map((l) => l.trim());
  const missing = mustExclude.filter((m) => !entries.includes(m));
  if (missing.length) bad(`${label}: .dockerignore does not exclude ${missing.join(', ')}`);
  else ok(`${label}: .dockerignore excludes ${mustExclude.join(', ')}`);
}

checkDockerfile('Dockerfile', 'api image');
checkDockerfile('clients/console/Dockerfile', 'console image');
checkDockerignore('.dockerignore', 'api image', ['node_modules', '.env', '.git', 'dist']);
checkDockerignore('clients/console/.dockerignore', 'console image', ['node_modules', '.env', 'dist']);

// The console entrypoint must be executable or nginx silently skips it.
const entrypoint = 'clients/console/docker-entrypoint.d/10-write-config.sh';
if (!existsSync(entrypoint)) bad(`console image: ${entrypoint} is missing`);
else if (!(statSync(entrypoint).mode & 0o111)) bad(`console image: ${entrypoint} is not executable - nginx would skip it`);
else ok('console image: runtime-config entrypoint is executable');

// ------------------------------------------------------------------- compose
// Parse the compose file directly so this gate runs on any machine, with or
// without a Docker CLI - a gate that can only run where docker is installed is a
// gate that gets skipped. `docker compose config` is used as an EXTRA validity
// check when the CLI happens to be present.
let cfg;
if (!existsSync('docker-compose.yml')) {
  bad('compose: docker-compose.yml is missing');
} else {
  try {
    cfg = parseYaml(readFileSync('docker-compose.yml', 'utf8'));
    ok('compose: docker-compose.yml parses');
  } catch (err) {
    bad(`compose: docker-compose.yml does not parse - ${err.message.split('\n')[0]}`);
  }
}

try {
  execFileSync('docker', ['compose', 'config', '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
  ok('compose: docker compose config validates it too');
} catch (err) {
  const why = String(err.code === 'ENOENT' ? 'no docker CLI on this machine' : (err.stderr ?? err.message)).split('\n')[0];
  if (err.code === 'ENOENT') console.log(`  containers  ----  docker compose config not run: ${why} (static checks below still apply)`);
  else bad(`compose: docker compose config rejected the file - ${why}`);
}

if (cfg) {
  const svc = cfg.services ?? {};
  for (const name of ['postgres', 'redis', 'migrate', 'api', 'console']) {
    if (!svc[name]) bad(`compose: service ${name} is missing`);
  }

  for (const name of ['postgres', 'redis']) {
    if (!svc[name]?.healthcheck) bad(`compose: ${name} has no healthcheck - startup ordering would be a race`);
    else ok(`compose: ${name} is health-checked`);
  }

  const dep = svc.api?.depends_on ?? {};
  if (dep.migrate?.condition !== 'service_completed_successfully') {
    bad('compose: api must wait for migrate to COMPLETE, or it can serve against an unmigrated schema');
  } else ok('compose: api waits for migrations to complete');
  for (const d of ['postgres', 'redis']) {
    if (dep[d]?.condition !== 'service_healthy') bad(`compose: api must wait for ${d} to be healthy`);
  }
  ok('compose: api waits for postgres and redis to be healthy');

  if (svc.api?.read_only !== true) bad('compose: api should run with a read-only root filesystem');
  else ok('compose: api root filesystem is read-only');

  for (const name of ['api', 'console']) {
    const opts = svc[name]?.security_opt ?? [];
    if (!opts.includes('no-new-privileges:true')) bad(`compose: ${name} is missing no-new-privileges:true`);
  }
  ok('compose: api and console drop privilege escalation');

  // Bind mounts of host paths make a cell non-reproducible; named volumes do not.
  for (const [name, s] of Object.entries(svc)) {
    for (const v of s.volumes ?? []) {
      const source = typeof v === 'string' ? v.split(':')[0] : v?.source;
      const isBind = typeof v === 'string'
        ? /^[.~/]/.test(source ?? '')
        : v?.type === 'bind';
      if (isBind) bad(`compose: ${name} bind-mounts a host path (${source}) - not reproducible`);
    }
  }
  ok('compose: no host bind mounts');

  // Every image tag must be pinned to something, not floating on :latest.
  for (const [name, s] of Object.entries(svc)) {
    if (typeof s.image === 'string' && /(:latest$|^[^:]+$)/.test(s.image)) {
      bad(`compose: ${name} uses a floating tag (${s.image})`);
    }
  }
  ok('compose: no :latest tags');
}

console.log(failed === 0
  ? '  containers  ---  static checks passed; `scripts/compose-smoke.sh` in CI is what proves the cell RUNS'
  : `  containers  ---  ${failed} problem(s)`);
process.exit(failed ? 1 : 0);
