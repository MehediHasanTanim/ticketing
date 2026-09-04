#!/usr/bin/env node
/**
 * HANDS-OFF REFRESH: `npm run refresh:watch`, started once in a Mac terminal.
 *
 * Every change to the source rebuilds both images, applies migrations and
 * re-verifies the cell, leaving it up. Claude edits this folder over the Cowork
 * bridge but has no Docker there, so this is what makes "always rebuild" true
 * without granting anything a network service would have to be opened for: you
 * start it, it watches the files, and it writes `.dev-refresh.log` - which Claude
 * reads over the bridge to check its own work.
 *
 * No dependencies, deliberately: `fs.watch` with `recursive` is native on macOS,
 * and a watcher that needs an install is one more thing to go stale.
 */
import { spawn } from 'node:child_process';
import { watch, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Anything that changes what lands in an image. */
const WATCH = [
  'contracts', 'core', 'app', 'adapters', 'edge', 'ops', 'scripts',
  'clients/console/src', 'clients/console/index.html', 'clients/console/package.json',
  'clients/console/Dockerfile', 'clients/console/nginx.conf', 'clients/console/vite.config.ts',
  'Dockerfile', 'docker-compose.yml', 'package.json', 'tsconfig.json', '.env',
];

/** Noise, and things this script itself writes. */
const IGNORE = [
  `node_modules${sep}`, `dist${sep}`, `.git${sep}`, `.dart_tool${sep}`,
  '.dev-refresh.log', '.DS_Store', `${sep}.`,
];

const DEBOUNCE_MS = 2000;

let timer = null;
let running = false;
let queued = false;
let changed = new Set();

const stamp = () => new Date().toISOString().slice(11, 19);

const run = () => {
  if (running) { queued = true; return; }
  running = true;
  const files = [...changed].slice(0, 6);
  const more = changed.size - files.length;
  changed = new Set();
  console.log(files.length === 0
    ? `\n[${stamp()}] initial refresh, so the cell matches the tree`
    : `\n[${stamp()}] changed: ${files.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`);
  console.log(`[${stamp()}] refreshing...`);

  const child = spawn('bash', [join(root, 'scripts', 'dev-refresh.sh')], {
    cwd: root, stdio: 'inherit',
  });
  child.on('exit', (code) => {
    running = false;
    console.log(code === 0
      ? `[${stamp()}] up to date. watching.`
      : `[${stamp()}] refresh FAILED (exit ${code}). Details are in .dev-refresh.log, which Claude can read. Watching.`);
    // A change that arrived mid-build is not lost - it triggers the next pass.
    if (queued) { queued = false; setTimeout(run, 250); }
  });
};

const onChange = (rel) => {
  if (!rel || IGNORE.some((i) => rel.includes(i))) return;
  changed.add(rel);
  clearTimeout(timer);
  // Coalesce: Claude writing eight files, or a save-all, is ONE rebuild.
  timer = setTimeout(run, DEBOUNCE_MS);
};

let watching = 0;
for (const target of WATCH) {
  const abs = join(root, target);
  if (!existsSync(abs)) continue;
  try {
    watch(abs, { recursive: true }, (_event, filename) => {
      onChange(filename ? relative(root, join(abs, filename.toString())) : target);
    });
    watching += 1;
  } catch (err) {
    console.error(`  cannot watch ${target}: ${(err).message}`);
  }
}

if (watching === 0) {
  console.error('nothing to watch - run this from the repository root');
  process.exit(1);
}

console.log(`watching ${watching} paths for changes. Ctrl-C to stop.`);
console.log('every change rebuilds both images, applies migrations and re-verifies the cell.');
run();  // Refresh once on start, so the cell matches the tree from the outset.
