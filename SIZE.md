# GymMate size report

Footprint of the completed optimisation pass: lucide icon tree-shaking, exercise
stills re-encoding, brand-icon palette quantisation. Every byte figure is
**uncompressed disk bytes** (`fs.statSync().size`) from `scripts/size-report.mjs`
— stable between runs, but not app-store download sizes. Expo SDK 57
(`expo` ~57.0.30, RN 0.86.3, Hermes).

## How this was measured

`scripts/size-report.mjs` runs a production `expo export --platform <p>` into a
throwaway directory (wiped first, then measured), so nothing lands in the repo
and `dist/` is never overwritten. It sums file sizes on disk into **js/bytecode**
(`.js` on web, `.hbc` on native, under `_expo/static/js/**`), **assets**
(everything under `assets/**`) and **export total** (every file, including
pre-rendered route HTML and `metadata.json`). Nothing is gzipped or
store-compressed. The web "before" is the preserved pre-change `dist/` export;
the android/ios "before" figures were taken after the icon change.

## Totals

| Platform | JS before | JS after | Assets before | Assets after | Total before | Total after | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| web | 4,997,554 | 2,808,458 | 13,788,618 | 8,690,897 | 19,105,059 | 11,840,310 | −7,264,749 (−38.0 %) |
| android | 4,632,432 | 4,633,091 | 14,761,951 | 9,664,230 | 19,490,093 | 14,394,355 | −5,095,738 (−26.1 %) |
| ios | 4,434,681 | 4,434,803 | 13,791,493 | 8,693,772 | 18,321,620 | 13,225,345 | −5,096,275 (−27.8 %) |

Two limits on the "before" column:

- The web baseline predates `/nutrition` (13 pre-rendered routes / 304,356 B
  versus 14 / 326,424 B now), so the comparison is conservative — it charges
  this pass for a screen it did not add. Delta = JS −2,189,096 + assets
  −5,097,721 − 22,068 B of extra route HTML.
- The android/ios JS columns (+659 B, +122 B) exclude the icon win; only web shows it end to end.

## Phase 1 — icon tree-shaking

`components/gymmate/icons.ts` value-imported the `lucide-react-native` barrel, and
Metro does not tree-shake, so every icon module shipped although the `Icons`
registry references 17. The fix is 17 deep subpath imports
(`lucide-react-native/icons/<kebab>`, an official `exports` subpath).

| Bundle probe | Before | After |
| --- | ---: | ---: |
| lucide icon definitions (`,size:24,node:[`) | 1,891 | **17** |
| `d:"M` SVG path nodes | 5,366 | 37 |
| `exercises/img` / `exercises/gif` references | 1,324 / 137 | 1,324 / 137 |
| unused `baby` icon path | present | absent |

Web entry JS fell 2,190,420 B (−43.8 %). Catalogue entries, media references and
other libraries' footprint are unchanged; the saving is lucide module bodies and
licence headers. The final web JS figure is 1,324 B above that phase-1
measurement — consistent with the one-character-longer `.webp` extension in each
of the 1,324 `imageUrl` requires.

## Phase 2 — exercise stills and brand icons

1,324 stills re-encoded JPEG → WebP at quality 80, effort 6, decode → encode with
no resize call, so every file is still exactly 180×180. 8,875,057 B → 3,777,336 B
(−5,097,721 B, −57.4 %); average 6.55 KB → 2.79 KB.

Quality was verified on **all 1,324 files**, not a sample: PSNR mean 41.05 dB, min
38.17 dB (`1350`), p1 38.60 dB, p50 41.07 dB; zero files below 38, 36 or 34 dB.
Licence terms unchanged: stills stay ≤180×180, nothing was upscaled, and the
`© Gym visual — https://gymvisual.com/` credit lines in `ExerciseDetailSheet` and
`app/(tabs)/you.tsx` are untouched.

| Brand asset | Before | After | Notes |
| --- | ---: | ---: | --- |
| `icon.png` | 393,493 | 204,931 | 1024×1024, palette, no alpha (iOS rejects icon alpha) |
| `android-icon-foreground.png` | 78,796 | 72,133 | 512×512, alpha preserved, bit-identical lossless |

Measured and rejected: a q90 `icon.png` variant (155,586 B) bands at 102 colours,
and a palette Android foreground scores 34.35 dB over transparent-adjacent pixels.
Swap integrity: all 1,324 in-repo files are SHA-256-identical to the reviewed
staging set, the `.jpg` count is 0, and the `lib/gymmate/data.ts` diff is 1,324
changed lines — every one an `imageUrl` require extension change.

## Phase 2a — animations, deliberately not shipped

All 137 animated WebP were characterised: 180×180 each, 12–54 frames (median 12),
2.1–9.5 s, 4,369,416 B total, 31.9 KB average, nothing under 17.9 KB. A full
q72 / effort-6 animated re-encode — frames, delays, loop flag and dimensions
preserved and verified — saved only **67 KB / 1.57 %**, with a minimum
middle-frame PSNR of 38.99 dB and no file beating 10 %. At the quality floor
(q68) the ceiling is 151 KB / 3.47 %. The sources are already near their operating
point, so 137 binary swaps are not worth it; the only real lever on that set is
frame count, which would change the motion. Decision: not shipped.

## Phase 3 — native binary

The figures above are **bundle-level only**: they describe what `expo export`
emits, not an installed APK/AAB/IPA. A local release APK build was attempted and
could not be produced, so no native install-size number is claimed here. Install
size is dominated by the native shell — React Native, Expo modules, Hermes and
`reanimated` / `screens` / `svg` — which app code cannot shrink. `eas.json` carries
the profiles needed:

| Profile | Output |
| --- | --- |
| `production` | AAB; Play splits per ABI and per density |
| `preview` | universal APK (all ABIs) |
| `preview-arm64` | direct-install arm64-only APK (`-PreactNativeArchitectures=arm64-v8a`) |

### Local release APK — attempted, not produced

A local release APK build was attempted on this machine and produced no APK. 2 of
345 Gradle tasks failed:
`:react-native-screens:buildCMakeRelWithDebInfo[arm64-v8a]` and
`:react-native-worklets:buildCMakeRelWithDebInfo[arm64-v8a][worklets]`.

Root cause is Windows path length, not app code:
`ninja: error: manifest 'build.ninja' still dirty after 100 tries`. Ninja 1.10.2 —
the version bundled with the CMake 3.22.1 that AGP selects — is not long-path aware,
and a prefab CMake path inside the pnpm virtual store is 291 characters, past
`MAX_PATH` (260). `LongPathsEnabled` does not help. Generated object paths reach
454 characters.

| Attempt | Why it failed |
| --- | --- |
| `subst` drive letter to shorten the root | autolinking walks up for `package.json` and stops before the drive root |
| NTFS junction to a short path | Gradle canonicalises it back to the real path |
| Forcing a newer CMake for AGP | AGP ignores it and uses the CMake it selects |

What did build: the release Hermes bundle, `index.android.bundle` = **3,820,948 B**.

No native-size claim is made in this report, because a local build here would be
unrepresentative in both directions. R8/minify was off and it was signed with a
debug keystore, which overstates size; `useLegacyPackaging=false` stores native
libraries uncompressed in the APK, which would overstate Play delivery as well.

Forward path: measure with EAS or Linux CI — `production` in `eas.json` for the AAB
(Play splits per ABI and density) and `preview-arm64` for the direct-install APK. A
local build would additionally need a short workspace root and a short pnpm
`virtual-store-dir`.

## What is still big

Web export composition (native assets are the same media plus platform chrome):

| Group | Files | Bytes | Share |
| --- | ---: | ---: | ---: |
| Exercise animations, animated WebP | 137 | 4,369,416 | 36.9 % |
| Exercise stills, WebP 180×180 | 1,324 | 3,777,336 | 31.9 % |
| Entry JS (web) | 1 | 2,808,458 | 23.7 % |
| Fonts, subset JetBrains Mono ×3 | 3 | 523,884 | 4.4 % |
| Route HTML + metadata (residual) | — | 340,955 | 2.9 % |
| expo-router PNGs | 18 | 20,261 | 0.2 % |
| **total** | | **11,840,310** | **100 %** |

Exercise media is 8,146,752 B — 68.8 % of the export, and the 137 animations
outweigh all 1,324 stills combined. Entry JS is smaller than either media group;
its content is mostly the 1,324-entry catalogue and its asset registrations.

## Known findings / not fixed

1. `assets/images/icon.png` is still the stock Expo template icon with construction
   guides visible — optimally compressed, but a placeholder; brand work before
   store submission.
2. `1306.webp` has `loop=1`; the other 136 animations loop infinitely.
3. `0551.webp` is a 54-frame / 9.5 s outlier at 97 KB against the 12-frame / 3 s norm.
4. Nothing was removed: no catalogue entry, no media file, no dependency, no font
   weight, no glyph range, no feature.

## Guardrails

| Command | Effect |
| --- | --- |
| `pnpm size:report` | all three platforms; prints the table and fails if any metric exceeds `size-budget.json` + `tolerancePct` (2 %) |
| `pnpm size:report -- --write-budget` | re-baselines `size-budget.json` after an intentional size change |
| `pnpm size:report -- --platform web` | one platform |
| `node scripts/check-catalog.mjs` | catalogue/media invariants — fails on orphan or missing media; proves the format swap was complete |
| `scripts/media/optimize-stills.mjs` | out-of-tree stills converter; `sharp` is **not** a repo dependency (scratch `gymmedia` project) |

`size-budget.json` now holds the post-pass baseline, so growth fails the next run.

## Reproduce

```powershell
# all three platforms, measured against size-budget.json
powershell -ExecutionPolicy Bypass -Command "pnpm size:report"
# one platform
powershell -ExecutionPolicy Bypass -Command "pnpm size:report -- --platform web"
# re-baseline after an intentional size change
powershell -ExecutionPolicy Bypass -Command "pnpm size:report -- --write-budget"
# catalogue and media invariants
powershell -ExecutionPolicy Bypass -Command "pnpm exec node scripts/check-catalog.mjs"
```

The stills converter needs `sharp`, which lives in the scratch `gymmedia` project, not this repo.
