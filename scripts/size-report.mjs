#!/usr/bin/env node
/**
 * Export-size harness for GymMate.
 *
 * Dependency-free. For each platform it runs the local Expo CLI (`node
 * node_modules/expo/bin/cli export ...`) into a throwaway directory under
 * `os.tmpdir()`, then measures what landed on disk:
 *
 *   - JS/bytecode bytes  — the `.js` / `.hbc` bundles under `_expo/static/js/**`
 *                          (source maps are reported separately; they are not shipped)
 *   - assets            — file count and bytes under `assets/**`
 *   - total             — every byte of the export directory
 *   - web only          — a per-file breakdown of `_expo/static/js/web/*`
 *
 * All numbers are UNCOMPRESSED disk bytes (`fs.statSync().size`), so they are
 * stable and comparable across runs but are *not* store download sizes.
 *
 * The repo's `dist/` is never written to or deleted — it is the "before"
 * snapshot that this harness is meant to be compared against.
 *
 * Budgets live in `size-budget.json` (repo root). A value of 0 or null means
 * "unset" and the check is skipped for it. The run fails only when a measured
 * value exceeds budget + tolerancePct; coming in under budget is always fine.
 *
 * Run: node scripts/size-report.mjs            (or `pnpm size:report`)
 *      pnpm size:report -- --write-budget      (rewrite size-budget.json from this run)
 *      pnpm size:report -- --platform web      (measure a single platform)
 *      pnpm size:report -- --no-clean          (reuse the temp dir instead of wiping it first)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_PATH = path.join(root, 'size-budget.json');
const PLATFORMS = ['web', 'android', 'ios'];
const BUNDLE_PATTERN = /\.(js|hbc)$/i;
const SOURCE_MAP_PATTERN = /\.map$/i;

// ------------------------------------------------------------------- args ---
const USAGE = `usage: node scripts/size-report.mjs [--write-budget] [--platform <${PLATFORMS.join('|')}>] [--no-clean]`;

const options = { writeBudget: false, clean: true, platforms: PLATFORMS };

for (let i = 0; i < process.argv.length - 2; i += 1) {
  const arg = process.argv[i + 2];
  if (arg === '--write-budget') {
    options.writeBudget = true;
  } else if (arg === '--no-clean') {
    options.clean = false;
  } else if (arg === '--platform') {
    const value = process.argv[i + 3];
    if (!PLATFORMS.includes(value)) {
      console.error(`size-report: --platform must be one of ${PLATFORMS.join(', ')}`);
      process.exit(1);
    }
    options.platforms = [value];
    i += 1;
  } else if (arg.startsWith('--platform=')) {
    const value = arg.slice('--platform='.length);
    if (!PLATFORMS.includes(value)) {
      console.error(`size-report: --platform must be one of ${PLATFORMS.join(', ')}`);
      process.exit(1);
    }
    options.platforms = [value];
  } else if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  } else {
    console.error(`size-report: unknown argument "${arg}"\n${USAGE}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------- helpers ---
const formatMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const formatBytes = (bytes) => String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatSize = (bytes) => `${formatMb(bytes)} (${formatBytes(bytes)} bytes)`;
const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - text.length));

/** Every regular file under `dir`, recursively. Missing directories yield []. */
const walkFiles = (dir) => {
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  return files.sort();
};

/** Uncompressed bytes actually on disk for the given files. */
const sumBytes = (files) => files.reduce((total, file) => total + fs.statSync(file).size, 0);

const relativeTo = (base, file) => path.relative(base, file).split(path.sep).join('/');

/** Resolve the Expo CLI entry point from `node_modules` (no shell, no npx). */
const resolveExpoCli = () => {
  const candidates = [
    path.join(root, 'node_modules', 'expo', 'bin', 'cli'),
    path.join(root, 'node_modules', 'expo', 'bin', 'cli.js'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    console.error('size-report: cannot find the Expo CLI in node_modules (run `pnpm install` first)');
    process.exit(1);
  }
  return found;
};

// ----------------------------------------------------------------- export ---
const exportPlatform = (platform, outDir) => {
  if (options.clean) {
    fs.rmSync(outDir, { recursive: true, force: true });
  } else if (fs.existsSync(outDir)) {
    console.warn(`size-report: --no-clean, reusing ${outDir} (totals may include stale files)`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const args = [resolveExpoCli(), 'export', '--platform', platform, '--output-dir', outDir, '--clear'];
  console.log(`\n$ node ${relativeTo(root, args[0])} ${args.slice(1).join(' ')}`);

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  });

  if (result.error) {
    console.error(`size-report: failed to start the Expo CLI: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`size-report: expo export --platform ${platform} exited with code ${result.status}`);
    process.exit(1);
  }
};

// --------------------------------------------------------------- measuring ---
const measure = (platform, outDir) => {
  const jsRoot = path.join(outDir, '_expo', 'static', 'js');
  const assetsRoot = path.join(outDir, 'assets');

  const jsFiles = walkFiles(jsRoot);
  const bundleFiles = jsFiles.filter((file) => BUNDLE_PATTERN.test(file));
  const sourceMapFiles = jsFiles.filter((file) => SOURCE_MAP_PATTERN.test(file));
  const entryFiles = bundleFiles.filter((file) => path.basename(file).startsWith('entry-'));

  const assetFiles = walkFiles(assetsRoot);
  const allFiles = walkFiles(outDir);

  return {
    platform,
    outDir,
    bundleFiles,
    entryFiles,
    jsBytes: sumBytes(bundleFiles),
    sourceMapBytes: sumBytes(sourceMapFiles),
    assetCount: assetFiles.length,
    assetBytes: sumBytes(assetFiles),
    totalBytes: sumBytes(allFiles),
    webChunks:
      platform === 'web'
        ? walkFiles(path.join(jsRoot, 'web')).map((file) => ({
            name: relativeTo(path.join(jsRoot, 'web'), file),
            bytes: fs.statSync(file).size,
          }))
        : [],
  };
};

const printReport = (result) => {
  const rows = [
    ['js/bytecode', result.jsBytes],
    ['assets', result.assetBytes],
    ['export total', result.totalBytes],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));

  console.log(`\n== ${result.platform} ==`);
  console.log(`  output dir:    ${result.outDir}`);
  console.log(`  entry bundle:  ${formatSize(sumBytes(result.entryFiles))} across ${result.entryFiles.length} file(s)`);
  for (const [label, bytes] of rows) {
    const suffix = label === 'assets' ? ` across ${result.assetCount} file(s)` : '';
    console.log(`  ${padEnd(label + ':', width + 1)} ${formatSize(bytes)}${suffix}`);
  }
  if (result.sourceMapBytes > 0) {
    console.log(`  source maps:   ${formatSize(result.sourceMapBytes)} (build output, not shipped)`);
  }
  console.log('  (all figures are uncompressed disk bytes)');

  if (result.webChunks.length > 0) {
    console.log(`  _expo/static/js/web/:`);
    const nameWidth = Math.max(...result.webChunks.map((chunk) => chunk.name.length));
    for (const chunk of result.webChunks) {
      console.log(`    ${padEnd(chunk.name, nameWidth)}  ${formatSize(chunk.bytes)}`);
    }
  }
};

// ----------------------------------------------------------------- budgets ---
const METRICS = [
  ['jsBytes', 'js/bytecode'],
  ['assetBytes', 'assets'],
  ['totalBytes', 'export total'],
];

const isUnset = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) === 0;

const readBudget = () => {
  if (!fs.existsSync(BUDGET_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
  } catch (error) {
    console.error(`size-report: size-budget.json is not valid JSON (${error.message})`);
    process.exit(1);
  }
};

const budget = readBudget();
const failures = [];

const checkBudget = (result) => {
  const platformBudget = budget?.platforms?.[result.platform];
  if (!platformBudget) return;
  const tolerancePct = Number(budget.tolerancePct ?? 0);
  const allowedPct = `+${tolerancePct}% tolerance`;

  for (const [key, label] of METRICS) {
    const limit = platformBudget[key];
    if (isUnset(limit)) continue;
    const measured = result[key];
    const allowed = Number(limit) * (1 + tolerancePct / 100);
    if (measured > allowed) {
      failures.push(
        `${result.platform} ${label}: ${formatSize(measured)} exceeds the budget of ` +
          `${formatBytes(Number(limit))} bytes ${allowedPct} (limit ${formatBytes(Math.floor(allowed))} bytes)`,
      );
      console.log(`  budget ${padEnd(label + ':', 12)} FAIL ${formatSize(measured)} > ${formatBytes(Number(limit))} bytes ${allowedPct}`);
    } else {
      console.log(`  budget ${padEnd(label + ':', 12)} ok   ${formatSize(measured)} <= ${formatBytes(Number(limit))} bytes ${allowedPct}`);
    }
  }
};

// ------------------------------------------------------------- write budget ---
const writeBudget = (results) => {
  const previous = budget ?? { tolerancePct: 2, platforms: {} };
  const next = {
    tolerancePct: Number(previous.tolerancePct ?? 2),
    platforms: {},
  };
  for (const platform of PLATFORMS) {
    const measured = results.get(platform);
    const fallback = previous.platforms?.[platform] ?? {};
    next.platforms[platform] = measured
      ? { jsBytes: measured.jsBytes, assetBytes: measured.assetBytes, totalBytes: measured.totalBytes }
      : { jsBytes: fallback.jsBytes ?? 0, assetBytes: fallback.assetBytes ?? 0, totalBytes: fallback.totalBytes ?? 0 };
  }
  fs.writeFileSync(BUDGET_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`\nsize-report: wrote ${relativeTo(root, BUDGET_PATH)} from this run`);
};

// -------------------------------------------------------------------- main ---
const results = new Map();
for (const platform of options.platforms) {
  const outDir = path.join(os.tmpdir(), `gymmate-size-${platform}`);
  exportPlatform(platform, outDir);
  const result = measure(platform, outDir);
  results.set(platform, result);
  printReport(result);
  checkBudget(result);
}

if (options.writeBudget) writeBudget(results);

if (failures.length > 0) {
  console.error(`\nsize-report: FAILED - ${failures.length} measurement(s) over budget:`);
  for (const message of failures) console.error(`  - ${message}`);
  console.error('If the growth is intentional, re-baseline with `pnpm size:report -- --write-budget`.');
  process.exit(1);
}

const summary = [...results.values()]
  .map((result) => `${result.platform} ${formatMb(result.totalBytes)}`)
  .join(', ');
console.log(`\nsize-report: OK - ${summary} (uncompressed disk bytes)${budget ? '' : ' [no size-budget.json, nothing to compare]'}`);
