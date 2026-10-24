# GymMate — Agent Instructions

Expo SDK 57 / React Native + Expo Router app. Dark-only, purple calm theme. This file merges the repo's original Expo rules with GymMate's current conventions.

## Expo version discipline — do not trust training data

Expo ships breaking changes every SDK release. Before touching any Expo/EAS/RN API:

1. Read the `expo` major version in `package.json` (currently ~57.0).
2. Fetch versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` and follow its links. Never answer from memory.

## Build & Run (pnpm + Windows PowerShell)

- Package manager: **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Bare `npx`/`pnpm exec` is blocked by the machine execution policy. Prefix with:
  `powershell -ExecutionPolicy Bypass -Command "pnpm exec <cmd>"`
- Dev server: `pnpm start` (then `a` / `i` / `w`)
- Typecheck (run before declaring done): `pnpm exec tsc --noEmit`
- Install SDK-compatible packages only: `pnpm exec expo install <pkg>`
- Diagnose: `pnpm exec expo-doctor`

## Project structure

- `app/` — Expo Router routes only. Root `_layout.tsx` owns fonts, the `RouteGate` splash/redirect gate and the stack; `onboarding.tsx` is the first-run flow (add `?edit=1` to edit an existing profile); `nutrition.tsx` is the full-screen calorie/macro tracker, a stack route reached from Today and You (deliberately not a sixth tab); `+not-found.tsx` is the 404; `+html.tsx` is the web shell (keep it — `web.output: static`). `(tabs)/_layout.tsx` defines the five tabs: `index` (Today), `workouts` (Plan), `cardio`, `progress`, `you`.
- `components/gymmate/` — route-agnostic design system, no store access. Barrel `index.ts` exports the primitives (`Card`, `SectionTitle`, `Pill`, `PrimaryButton`, `GhostButton`, `EmptyState`, `ScreenHeader`, `StatTile`, `NumberStepper`, `ExerciseRow`, `VolumeBars`). Domain groups have their own barrels: `onboarding/`, `plan/`, `profile/`, `exercise/` (`ExerciseVisual`, `ExerciseDetailSheet`), `nutrition/` (`MacroRing`, `MacroBar`, `NutritionOverview`, `TodayNutritionCard`, `MealRow`, `AddMealSheet`). `today/` pieces are imported by path (`GoalTile`, `LoggedTodayCard`, `WeekVolume`, `WorkoutSheet`).
- **Exercise imagery is real bundled media, not illustration.** Every lift draws its bundled 180×180 still through `ExerciseVisual`; `ExerciseDetailSheet` shows the animated `gifUrl` when a lift has one. There is no vector/figure fallback — never add one.
- `lib/gymmate/` — `store.tsx` (Context + reducer + AsyncStorage persistence + pure selectors), `nutrition.ts` (pure target/macro maths — `nutritionTargetFor` derives calorie and macro targets from the profile goal + latest weigh-in), `data.ts` (the 1,324-lift exercise catalog and its search/lookup helpers), `format.ts` (display formatters, no React).
- `assets/exercises/img/` — one bundled 180×180 JPG per catalog entry (`LibraryExercise.imageUrl`). `assets/exercises/gif/` — animated WebP for the 137 featured lifts only (`LibraryExercise.gifUrl`). `lib/gymmate/data.ts` and these assets are generated together — do not hand-edit the catalog or the media, and never re-encode the stills above 180×180.
- `hooks/` — `useDebounce.ts` and future shared hooks.
- `assets/fonts/` — three **subset** JetBrains Mono weights (`JetBrainsMono-{Regular,Medium,Bold}.ttf`, ~173 KB each, ~93% smaller than the Nerd-Font builds they replace; `SpaceMono` is gone). Subsetting runs out-of-tree in the scratch `gymmedia` project with `subset-font` (HarfBuzz/wasm) to ASCII printable + Latin-1 Supplement + Latin Extended-A/B + General Punctuation + arrows/math + currency + `°×·—–…`. The Nerd-Font Private-Use-Area icon/Powerline ranges are dropped — the app never draws glyphs, every icon comes from the `Icons` lucide registry. Re-run the same scratch script if the set of characters rendered in a `fontMono*` style ever grows.
- `constants/GymMateTheme.ts` — source of truth for colour tokens and the only `.ts`/`.tsx` file that may hold a hex value (the sole other one is the raw CSS in the `app/+html.tsx` web shell). Also exports the layout-width contract: `MAX_CONTENT_WIDTH` and `SHEET_MAX_WIDTH` (both 640) cap content and bottom sheets on tablets/desktop web — import them, never invent a local width.
- No `ios/`/`android/` dirs (Continuous Native Generation). Configure native behavior in `app.json`, never hand-create them.

## Conventions

- **Dark only**: `userInterfaceStyle` is pinned `"dark"` in `app.json` (never `automatic`) and `<StatusBar style="light" />` is rendered exactly once in `app/_layout.tsx`, so system chrome — status bar, keyboard, text-selection menu, share sheet — is always light-on-dark. `ThemeProvider` is forced to `DarkTheme`; splash, web shell and adaptive icon backgrounds are all set to the theme `bg` in `app.json` / `app/+html.tsx`. Tokens live in `constants/GymMateTheme.ts` (`T`), never inline: bg `#0D0C11`, surface `#15131C`, surface2 `#1C1926`, line `#2A2638`, accent `#B3A1FF`, accentInk `#150F2A`, ink `#EDE9E6`, muted `#A29EAF`, label `#C6C2D6`, danger `#FF9D9D` / dangerBorder `#3A2630`, success `#9AD8BE`, goalLose `#8E7BF0`, goalGain `#C9A7F5`.
- **State**: shared state via `GymMateProvider` (`lib/gymmate/store.tsx`), immutable reducer updates, `useGym()` selector, functional `setState(prev => …)`.
- **Persistence contract**: hydrate once under key `gymmate/v1` (payload: profile, schedule, workout logs, cardio runs, weigh-ins and meals); `parsePersisted` returns `{ ok }` and a failed read/corrupt blob is copied to `gymmate/v1.corrupt` and sets `persistable: false`, so the write effect (`hydrated && persistable`) can never overwrite good data with an empty payload. A blob written before nutrition existed has no `meals` key and hydrates as an empty list with `ok: true` (backward compatible — not treated as corruption). `RESET_ALL` re-enables persistence.
- **Styles (strict TS)**: `StyleSheet.create` unions collapse — declare each style as `TextStyle`/`ViewStyle` first, then pass the map to `StyleSheet.create`. Never use `fontWeight: '650'` (invalid); use `600`/`700`/`800`. Never name a style `delete` (reserved word).
- **Naming**: `PascalCase.tsx` components, `useX.ts` hooks, `camelCase` utils. Verb-noun functions, descriptive names, no `any`.
- **A11y**: interactive rows are `Pressable` with roles (`tab`, `checkbox`, `button`), 44px+ targets, visible focus on web. Charts expose one real `summary` string instead of ambiguous bar labels.
- **Exercise media licence**: metadata comes from `yuhonas/free-exercise-db` (Unlicense); the bundled stills/animations are © Gym visual — https://gymvisual.com/ and must stay ≤180×180 with the credit line visible. Keep `© Gym visual — https://gymvisual.com/` in the exercise detail sheet and `app/(tabs)/you.tsx`.
- **Commits**: single `main` branch, one `Initial commit` so far — no detectable message convention yet.

## Navigation & EAS

- Expo Router for all navigation (`Link`, `router`, `useLocalSearchParams` from `expo-router`). Docs: `https://docs.expo.dev/router/introduction.md`. `/nutrition` is a root-stack route registered in `app/_layout.tsx`, not a tab — the tab bar keeps its five items.
- `predictiveBackGestureEnabled` stays **false** (its default): Android's predictive back previews the popping screen mid-gesture and conflicts with the app's RN `Modal` bottom sheets, which the gesture would expose behind the sheet.
- EAS for cloud builds/OTA (`eas build`, `eas submit`, `eas update`). Run as `pnpm exec eas-cli@latest <cmd>` here. New native modules need a dev build (`expo run:ios|android` or `eas build --profile development`); Expo Go won't include them.

## Skills — load before the task, not after

- `frontend-patterns` — any React component, hook, state, form, or list work.
- `frontend-design` — new screens or visual-direction changes (protects the calm purple identity).
- `impeccable` — Operate-mode UI polish, critique, or empty/error-state hardening.
- `code-reviewer` — before large refactors or PRs.
- `deployment-patterns` — EAS builds, OTA updates, release readiness.
- `report` — filing Expo/React Native upstream issues.
- `codebase-onboarding` — refreshing this file when the structure changes.
