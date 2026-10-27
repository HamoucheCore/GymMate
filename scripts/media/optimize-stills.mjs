#!/usr/bin/env node
/**
 * Exercise stills optimiser for GymMate — a build-time, OUT-OF-TREE tool.
 *
 * `sharp` is NOT a dependency of this repo and must never become one: it is a
 * native libvips binding that would land a build toolchain in an Expo app that
 * only ever consumes the resulting bytes. Install it in a scratch project
 * (`cd $env:TEMP\gymmedia; pnpm add sharp`) and run this script from there, or
 * run it via `pnpm dlx` with `sharp` resolvable — never `pnpm add sharp` here.
 *
 * Why this exists: the 1,324 bundled exercise stills are ~78% of the shipped
 * app bytes, and re-encoding them to WebP at the same 180x180 cuts that by
 * more than half while leaving the licence terms (© Gym visual — stay at or
 * below 180x180, keep the credit line) completely intact.
 *
 * It reads `assets/exercises/img/<id>.jpg` and writes `<out>/<id>.webp` — it
 * never writes in place, and it refuses any `--out` inside `assets/`. Every
 * input must already be exactly 180x180: a size mismatch aborts the run
 * instead of being resized, because upscaling, cropping or resampling would
 * break the licence and change the catalog the app renders.
 *
 * Run:
 *   node scripts/media/optimize-stills.mjs --out "$env:TEMP\stills-webp"
 *   node scripts/media/optimize-stills.mjs --out "$env:TEMP\stills-webp" --quality 80 --effort 6 --verify
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = path.join(root, 'assets', 'exercises', 'img');
const ASSETS_DIR = path.join(root, 'assets');

const STILL_EDGE = 180;
const EXPECTED_STILLS = 1324;
const DEFAULT_OUT = path.join(os.tmpdir(), 'gymmate-stills-webp');
const VERIFY_SAMPLE = 40;

const usage = `Usage: node scripts/media/optimize-stills.mjs [options]

  --out <dir>      staging directory for the .webp output
                   (default: ${DEFAULT_OUT})
  --quality <n>    WebP lossy quality, 1-100          (default: 80)
  --effort <n>     WebP encoder effort, 0-6           (default: 6)
  --verify         assert every input is ${STILL_EDGE}x${STILL_EDGE} and print a
                   PSNR summary for a ${VERIFY_SAMPLE}-file stratified sample
  --help           show this message

Output is 1:1 with the input filenames. Nothing is written in place, and an
--out inside assets/ is refused.`;

// ------------------------------------------------------------------ args ---
const argv = process.argv.slice(2);
const argValue = (flag) => {
  const at = argv.indexOf(flag);
  if (at < 0) return undefined;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`optimize-stills: ${flag} needs a value\n\n${usage}`);
    process.exit(1);
  }
  return value;
};

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const KNOWN_FLAGS = new Set(['--out', '--quality', '--effort', '--verify', '--help', '-h']);
const unknown = argv.filter((arg) => arg.startsWith('-') && !KNOWN_FLAGS.has(arg));
if (unknown.length > 0) {
  console.error(`optimize-stills: unknown option(s): ${unknown.join(', ')}\n\n${usage}`);
  process.exit(1);
}

const numberArg = (flag, fallback, min, max) => {
  const raw = argValue(flag);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    console.error(`optimize-stills: ${flag} must be an integer in ${min}-${max}, got "${raw}"`);
    process.exit(1);
  }
  return value;
};

const quality = numberArg('--quality', 80, 1, 100);
const effort = numberArg('--effort', 6, 0, 6);
const verify = argv.includes('--verify');
const outDir = path.resolve(argValue('--out') ?? DEFAULT_OUT);

// --------------------------------------------------------------- guards ---
const isInside = (child, parent) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

if (isInside(outDir, ASSETS_DIR)) {
  console.error(
    `optimize-stills: refusing to write into assets/ — "${outDir}" is inside "${ASSETS_DIR}".\n` +
      'Stage the output somewhere else and swap it in deliberately after review.',
  );
  process.exit(1);
}
if (outDir === SRC_DIR) {
  console.error('optimize-stills: refusing to write in place over the source stills.');
  process.exit(1);
}

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error(
    'optimize-stills: `sharp` is not installed.\n' +
      'It is a build-time tool only — install it in a scratch project, not this repo:\n' +
      '  cd $env:TEMP\\gymmedia; pnpm add sharp\n' +
      '  node scripts/media/optimize-stills.mjs --out <dir>',
  );
  process.exit(1);
}

// ---------------------------------------------------------------- source ---
let sourceFiles;
try {
  sourceFiles = fs.readdirSync(SRC_DIR).filter((file) => file.toLowerCase().endsWith('.jpg')).sort();
} catch {
  console.error(`optimize-stills: cannot read ${path.relative(root, SRC_DIR)}`);
  process.exit(1);
}
if (sourceFiles.length === 0) {
  console.error(`optimize-stills: no .jpg files in ${path.relative(root, SRC_DIR)}`);
  process.exit(1);
}
if (sourceFiles.length !== EXPECTED_STILLS) {
  console.error(
    `optimize-stills: expected ${EXPECTED_STILLS} source stills, found ${sourceFiles.length}. ` +
      'Update EXPECTED_STILLS only after confirming the catalog matches.',
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const resolvedOut = path.resolve(outDir);
const outIsSource = fs.readdirSync(resolvedOut).some((file) => file.toLowerCase().endsWith('.jpg'));
if (outIsSource) {
  console.error(`optimize-stills: "${resolvedOut}" already holds .jpg files — pick a clean staging directory.`);
  process.exit(1);
}

console.log(
  `optimize-stills: ${sourceFiles.length} stills -> ${resolvedOut}\n` +
    `                 webp quality=${quality} effort=${effort} smartSubsample=true, metadata stripped`,
);

// ---------------------------------------------------------------- convert ---
const rows = [];
let failures = 0;

for (const file of sourceFiles) {
  const id = file.slice(0, -path.extname(file).length);
  const srcPath = path.join(SRC_DIR, file);

  let meta;
  try {
    meta = await sharp(srcPath).metadata();
  } catch {
    console.error(`  FAIL ${file}: not a readable image`);
    failures++;
    continue;
  }

  if (meta.width !== STILL_EDGE || meta.height !== STILL_EDGE) {
    console.error(
      `  FAIL ${file}: ${meta.width}x${meta.height}, expected ${STILL_EDGE}x${STILL_EDGE} — ` +
        'refusing to resize (the licence pins the stills at or below 180x180).',
    );
    failures++;
    continue;
  }

  const destPath = path.join(resolvedOut, `${id}.webp`);
  // No resize call: the pipeline is decode -> encode only, so no resampling.
  const info = await sharp(srcPath)
    .webp({ quality, effort, smartSubsample: true })
    .toFile(destPath);

  if (info.width !== STILL_EDGE || info.height !== STILL_EDGE) {
    console.error(`  FAIL ${id}.webp: came out ${info.width}x${info.height}`);
    failures++;
    continue;
  }

  rows.push({ id, src: fs.statSync(srcPath).size, out: info.size });
}

if (failures > 0) {
  console.error(`\noptimize-stills: FAILED — ${failures} file(s) rejected, no summary produced.`);
  process.exit(1);
}

// --------------------------------------------------------------- coverage ---
const outputs = fs.readdirSync(resolvedOut).filter((file) => file.toLowerCase().endsWith('.webp')).sort();
const expectedOutputs = sourceFiles.map((file) => `${file.slice(0, -path.extname(file).length)}.webp`).sort();
const missing = expectedOutputs.filter((name) => !outputs.includes(name));
const extra = outputs.filter((name) => !expectedOutputs.includes(name));
if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) console.error(`  missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`);
  if (extra.length > 0) console.error(`  extra:   ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ' …' : ''}`);
  console.error(`optimize-stills: FAILED — ${outputs.length} outputs for ${expectedOutputs.length} inputs, not 1:1.`);
  process.exit(1);
}

const srcTotal = rows.reduce((total, row) => total + row.src, 0);
const outTotal = rows.reduce((total, row) => total + row.out, 0);
const kb = (bytes) => (bytes / 1024).toFixed(2);
const sortedBySize = [...rows].sort((a, b) => a.out - b.out);
const smallest = sortedBySize[0];
const largest = sortedBySize[sortedBySize.length - 1];

console.log(`\n  files:        ${rows.length} (1:1 mapping, 0 missing, 0 extra)`);
console.log(`  source total: ${srcTotal} bytes (${kb(srcTotal)} KB)`);
console.log(`  output total: ${outTotal} bytes (${kb(outTotal)} KB)`);
console.log(`  delta:        -${srcTotal - outTotal} bytes`);
console.log(`  saving:       ${(100 - (outTotal / srcTotal) * 100).toFixed(2)}%`);
console.log(`  average:      ${(outTotal / rows.length / 1024).toFixed(3)} KB per still`);
console.log(`  min / max:    ${smallest.out} B (${smallest.id}.webp) / ${largest.out} B (${largest.id}.webp)`);

// ---------------------------------------------------------- psnr sample ---
const rawRgb = async (file) => {
  const { data, info } = await sharp(file).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3 || info.width !== STILL_EDGE || info.height !== STILL_EDGE) {
    throw new Error(`${path.basename(file)} did not decode to ${STILL_EDGE}x${STILL_EDGE}x3`);
  }
  return data;
};

const psnr = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = a[i] - b[i];
    sum += delta * delta;
  }
  const mse = sum / a.length;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
};

const stratifiedSample = () => {
  const byBytes = [...rows].sort((a, b) => a.src - b.src);
  const chosen = new Set([...byBytes.slice(0, 5), ...byBytes.slice(-5)].map((row) => row.id));
  const byId = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const stride = byId.length / (VERIFY_SAMPLE - chosen.size);
  for (let step = 0; chosen.size < VERIFY_SAMPLE && step < byId.length * 4; step++) {
    chosen.add(byId[Math.min(byId.length - 1, Math.round(step * stride))].id);
  }
  return [...chosen].sort();
};

if (verify) {
  const sample = stratifiedSample();
  const scores = [];
  for (const id of sample) {
    const db = psnr(await rawRgb(path.join(SRC_DIR, `${id}.jpg`)), await rawRgb(path.join(resolvedOut, `${id}.webp`)));
    scores.push({ id, db });
  }
  scores.sort((a, b) => a.db - b.db);

  const average = scores.reduce((total, score) => total + score.db, 0) / scores.length;
  const worst = scores[0];
  const under38 = scores.filter((score) => score.db < 38).length;
  const under34 = scores.filter((score) => score.db < 34).length;

  console.log(`\n  PSNR (${scores.length}-file stratified sample: 5 smallest + 5 largest source + even spread by id)`);
  console.log(`    average:      ${average.toFixed(3)} dB (${Math.round(average * 1000)} mdB)`);
  console.log(`    worst:        ${worst.db.toFixed(3)} dB — ${worst.id}`);
  console.log(`    under 38 dB:  ${under38}`);
  console.log(`    under 34 dB:  ${under34}`);
  if (average < 38 || worst.db < 34) {
    console.error('optimize-stills: quality gate FAILED — lower --quality is not the fix; re-check the source stills.');
    process.exit(1);
  }
}

console.log('\noptimize-stills: OK — staged, nothing in assets/ was touched.');
