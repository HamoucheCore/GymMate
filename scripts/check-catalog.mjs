#!/usr/bin/env node
/**
 * Catalog invariants checker for GymMate.
 *
 * Dependency-free and text-only: it parses `lib/gymmate/data.ts` with regular
 * expressions (the file is generated, one field per line) so it can run under
 * plain `node` without a TypeScript toolchain, and cross-checks the bundled
 * media on disk. Exits non-zero with a clear message on the first category of
 * failure it finds; prints a summary line when everything passes.
 *
 * Run: node scripts/check-catalog.mjs   (or `pnpm check:catalog`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(root, 'lib', 'gymmate', 'data.ts');

const EXPECTED_ENTRIES = 1324;
const VALID_MUSCLES = new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']);

const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------- parse ---
let text;
try {
  text = fs.readFileSync(DATA_PATH, 'utf8');
} catch {
  console.error(`check-catalog: cannot read ${path.relative(root, DATA_PATH)}`);
  process.exit(1);
}

const ARRAY_HEAD = 'export const LIBRARY: LibraryExercise[] = [';
const headAt = text.indexOf(ARRAY_HEAD);
const tailAt = text.indexOf('\n];\n\nconst NAME_INDEX');
if (headAt < 0 || tailAt < 0) {
  console.error('check-catalog: could not locate the LIBRARY array in data.ts');
  process.exit(1);
}
const body = text.slice(headAt + ARRAY_HEAD.length, tailAt + 2);

const blocks = [];
for (const match of body.matchAll(/(?:^|\n)  \{\n([\s\S]*?)\n  \},/g)) {
  blocks.push(match[0].replace(/^\n/, ''));
}

const str = (block, key) => {
  const hit = block.match(new RegExp(`(?:^|\\n)\\s*${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return hit ? hit[1] : undefined;
};
const hasKey = (block, key) => new RegExp(`(?:^|\\n)\\s*${key}:`).test(block);
const requirePath = (block, key) => {
  const hit = block.match(new RegExp(`${key}:\\s*require\\('([^']+)'\\)`));
  return hit ? hit[1] : undefined;
};
const instructionsAreEmpty = (block) => {
  const hit = block.match(/instructions:\s*\[([\s\S]*?)\]/);
  return hit ? !hit[1].includes('"') : true;
};

const entries = blocks.map((block) => ({
  block,
  id: str(block, 'id'),
  name: str(block, 'name'),
  muscle: str(block, 'muscle'),
  equipment: str(block, 'equipment'),
  featured: /(?:^|\n)\s*featured: true,/.test(block),
  imageUrl: requirePath(block, 'imageUrl'),
  gifUrl: requirePath(block, 'gifUrl'),
  hasLevel: hasKey(block, 'level'),
  hasMechanic: hasKey(block, 'mechanic'),
  hasCategory: hasKey(block, 'category'),
  instructionsEmpty: instructionsAreEmpty(block),
}));

// ------------------------------------------------------------ invariants ---
if (entries.length !== EXPECTED_ENTRIES) {
  fail(`expected ${EXPECTED_ENTRIES} entries, found ${entries.length}`);
}

const seenIds = new Map();
const seenNames = new Map();
for (const entry of entries) {
  if (!entry.id) fail(`entry "${entry.name ?? '?'}" has no id`);
  else if (seenIds.has(entry.id)) fail(`duplicate id: ${entry.id}`);
  else seenIds.set(entry.id, entry);

  if (!entry.name) fail(`entry ${entry.id} has no name`);
  else {
    const key = entry.name.trim().toLowerCase();
    if (seenNames.has(key)) fail(`duplicate display name: "${entry.name}" (${seenNames.get(key)} & ${entry.id})`);
    else seenNames.set(key, entry.id);
  }

  if (entry.muscle !== undefined && !VALID_MUSCLES.has(entry.muscle)) {
    fail(`invalid muscle "${entry.muscle}" on ${entry.id} (${entry.name})`);
  }

  if (!entry.imageUrl) fail(`missing imageUrl on ${entry.id} (${entry.name})`);

  if (entry.featured && !entry.gifUrl) fail(`featured entry ${entry.id} (${entry.name}) has no gifUrl`);
  if (!entry.featured && entry.gifUrl) fail(`non-featured entry ${entry.id} (${entry.name}) has a gifUrl`);

  if (!entry.featured) {
    if (entry.hasLevel) fail(`non-featured ${entry.id} (${entry.name}) carries level`);
    if (entry.hasMechanic) fail(`non-featured ${entry.id} (${entry.name}) carries mechanic`);
    if (entry.hasCategory) fail(`non-featured ${entry.id} (${entry.name}) carries category`);
    if (!entry.instructionsEmpty) fail(`non-featured ${entry.id} (${entry.name}) carries instructions`);
  }
}

// --------------------------------------------------- bundled media on disk ---
const mediaDirs = [
  { key: 'imageUrl', dir: path.join(root, 'assets', 'exercises', 'img') },
  { key: 'gifUrl', dir: path.join(root, 'assets', 'exercises', 'gif') },
];

for (const { key, dir } of mediaDirs) {
  const referenced = new Set();
  for (const entry of entries) {
    const value = key === 'imageUrl' ? entry.imageUrl : entry.gifUrl;
    if (!value) continue;
    const abs = path.resolve(path.join(root, 'lib', 'gymmate'), value);
    referenced.add(path.basename(abs));
    if (!fs.existsSync(abs)) {
      fail(`${entry.id} (${entry.name}) references a missing ${key}: ${value}`);
    } else if (fs.statSync(abs).size === 0) {
      fail(`${entry.id} (${entry.name}) references an empty ${key}: ${value}`);
    }
  }

  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    fail(`missing media directory: ${path.relative(root, dir)}`);
    continue;
  }
  for (const file of files) {
    if (!referenced.has(file)) fail(`orphan file not referenced by the catalog: ${path.relative(root, path.join(dir, file))}`);
  }
}

// ----------------------------------------------------------------- report ---
if (failures.length > 0) {
  console.error(`check-catalog: FAILED with ${failures.length} problem${failures.length === 1 ? '' : 's'}:`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

const featured = entries.filter((entry) => entry.featured).length;
const withMuscle = entries.filter((entry) => entry.muscle !== undefined).length;
console.log(
  `check-catalog: OK - ${entries.length} entries (${featured} featured), ` +
    `${seenNames.size} unique names, ${withMuscle} with a muscle group, all media present and referenced.`,
);
