#!/usr/bin/env node
/**
 * normalize-domains.js — snap every domain tag to the config's official names.
 *
 * The generator reliably produces the RIGHT domains but drifts on formatting:
 * it drops the "Domain N:" prefix ("Design Applications" instead of
 * "Domain 1: Design Applications"), appends a weight ("... (14%)"), or adds a
 * granular subtopic ("Application Development - Vector Search API"). All three
 * fail QA's exact-match domain gate even though the domain is correct.
 *
 * This maps each chapter's exam_domain and each question's domain to the exact
 * canonical name from the course config, deterministically, with no model call.
 * A tag that cannot be confidently mapped is left untouched and reported, so a
 * genuinely wrong domain (e.g. a retired exam version) is never silently masked.
 *
 * Usage:
 *   node scripts/normalize-domains.js --slug=<slug>            # fix
 *   node scripts/normalize-domains.js --slug=<slug> --dry-run  # report only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
if (!args.slug) { console.error('Usage: node scripts/normalize-domains.js --slug=<slug> [--dry-run]'); process.exit(1); }

const DIR = path.join(ROOT, 'generated', args.slug);
const STATE = path.join(DIR, 'state.json');
if (!fs.existsSync(STATE)) { console.error(`No state.json for "${args.slug}"`); process.exit(1); }
const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));

// find the config for this slug to get the official domain names
const cfgFile = fs.readdirSync(path.join(ROOT, 'course-configs'))
  .map(f => path.join(ROOT, 'course-configs', f))
  .find(f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).slug === args.slug; } catch { return false; } });
if (!cfgFile) { console.error(`No course-config with slug "${args.slug}"`); process.exit(1); }
const official = (JSON.parse(fs.readFileSync(cfgFile, 'utf8')).domains || []).map(d => d.name);

// normalise a string for comparison: lowercase, strip a trailing "(NN%)",
// strip a leading "Domain N:" prefix, strip a " - subtopic" suffix, squeeze space
const strip = s => String(s || '')
  .replace(/\s*\(\s*~?\d+\s*%?\s*\)\s*$/i, '')
  .replace(/^\s*domain\s*\d+\s*[:\-–—]\s*/i, '')
  .replace(/\s+[-–—]\s+.*$/, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();
const numOf = s => (String(s || '').match(/^\s*domain\s*(\d+)/i) || [])[1];

const officialByStrip = new Map(official.map(o => [strip(o), o]));
const officialByNum = new Map(official.map(o => [numOf(o), o]).filter(([n]) => n));
const isSummary = d => /^all domains/i.test(String(d || '').trim());

// map a raw tag to a canonical official name, or null if it must be left alone
function canonical(raw) {
  if (!raw || isSummary(raw)) return null;
  if (official.includes(raw)) return null;             // already exact
  const s = strip(raw);
  if (officialByStrip.has(s)) return officialByStrip.get(s);   // title matches, prefix/weight/subtopic differ
  const n = numOf(raw);
  if (n && officialByNum.has(n)) {                     // "Domain 3: <anything>" -> canonical Domain 3
    const canon = officialByNum.get(n);
    // only trust the number if the title is plausibly the same domain, else report
    if (strip(canon) === s || s.startsWith(strip(canon)) || strip(canon).startsWith(s)) return canon;
  }
  return undefined;                                    // undefined = could not map (report, don't touch)
}

let changed = 0;
const unmapped = new Map();
function fix(obj, key) {
  const c = canonical(obj[key]);
  if (c === null) return;               // already fine or a summary
  if (c === undefined) { unmapped.set(obj[key], (unmapped.get(obj[key]) || 0) + 1); return; }
  if (!args['dry-run']) obj[key] = c;
  changed++;
}

for (const ch of (state.curriculum && state.curriculum.chapters) || []) {
  if (ch.exam_domain !== undefined) fix(ch, 'exam_domain');
  const m = (state.materials || {})[`ch${ch.number}`];
  for (const q of (m && m.questions) || []) fix(q, 'domain');
}
for (const k of Object.keys(state.tests || {})) for (const q of state.tests[k] || []) fix(q, 'domain');

console.log(`\n${args.slug}`);
console.log(`  official domains: ${official.length}`);
console.log(`  tags ${args['dry-run'] ? 'that would be normalised' : 'normalised'}: ${changed}`);
if (unmapped.size) {
  console.log(`  ⚠️  ${unmapped.size} tag(s) could NOT be mapped to an official domain — check these are not from a wrong/retired exam version:`);
  for (const [d, n] of unmapped) console.log(`      ${n}x  "${d}"`);
}
if (!args['dry-run'] && changed) {
  const backup = path.join(DIR, `state.backup.domains.${Date.now()}.json`);
  fs.writeFileSync(backup, fs.readFileSync(STATE));
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  console.log(`  saved · backup ${path.basename(backup)}`);
  console.log(`\n  Next: re-run the assemble stage, then npm run qa -- --slug=${args.slug}\n`);
}
process.exit(unmapped.size ? 1 : 0);
