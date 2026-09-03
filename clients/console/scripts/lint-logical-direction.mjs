#!/usr/bin/env node
/**
 * AD-12 / UX-DR-2: logical direction only. No left/right in layout.
 *
 * Cheap rule, enormous payoff: the spine is explicit that retrofitting
 * bidirectional layout after the console exists is a rebuild of the layout layer,
 * and Arabic ships in R1. Catching it at commit time is the whole point.
 *
 * Comments are stripped before scanning, so prose that mentions the banned
 * properties (like this file, and tokens.css) does not trip the rule. The first
 * version did trip on its own comment - found by running it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  { re: /\b(margin|padding|border)-(left|right)\b/, hint: 'use the -inline-start / -inline-end logical property' },
  { re: /^\s*(left|right)\s*:\s*(?!auto)/,          hint: 'use inset-inline-start / inset-inline-end' },
  { re: /\btext-align\s*:\s*(left|right)\b/,        hint: 'use text-align: start / end' },
  { re: /\bfloat\s*:\s*(left|right)\b/,             hint: 'use float: inline-start / inline-end' },
  { re: /\bEdgeInsets\.only\(\s*(left|right):/,     hint: 'use EdgeInsetsDirectional.only(start:/end:)' },
];
const ALLOW = /logical-direction-allow/;

/** Blank out comments so prose cannot trip the rule, preserving line numbers. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));

const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (/node_modules|dist/.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|tsx|ts|dart)$/.test(p)) out.push(p);
  }
  return out;
};

let bad = 0;
let scanned = 0;
for (const f of walk('src')) {
  scanned++;
  stripComments(readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
    if (ALLOW.test(line)) return;
    for (const { re, hint } of BANNED) {
      if (re.test(line)) {
        bad++;
        console.log(`  direction  FAIL  ${f}:${i + 1}  ${line.trim()}`);
        console.log(`                   ${hint}`);
      }
    }
  });
}
if (bad === 0) console.log(`  direction  PASS  ${scanned} files, logical properties only (AD-12)`);
process.exit(bad ? 1 : 0);
