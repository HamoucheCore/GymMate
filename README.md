# GymMate

A personal, dark-only strength-training tracker. One person records their own lifts,
cardio and bodyweight on their own device — no account, no cloud.

## Stack

Expo SDK 57 / React Native 0.86 / Expo Router with typed routes (`experiments.typedRoutes`
in `app.json`), strict TypeScript, pnpm. Android, iOS and web; the web build is a static
export (`web.output: static`, shell at `app/+html.tsx`).

## Quick start

```powershell
pnpm install
pnpm start        # then press a / i / w for Android, iOS or web
```

On this Windows machine the execution policy blocks a bare `pnpm exec`, so prefix such
commands with `powershell -ExecutionPolicy Bypass -Command "pnpm exec <cmd>"` (see
`AGENTS.md`). New native modules need a dev build — `expo run:android` / `expo run:ios`
or `eas build --profile development` — because Expo Go cannot load them.

## Commands

| Command | Effect |
| --- | --- |
| `pnpm start` | Metro dev server for all three platforms. |
| `pnpm android` / `pnpm ios` / `pnpm web` | Dev server opened on one platform. |
| `pnpm typecheck` | `tsc --noEmit`, strict; run before declaring work done. |
| `pnpm lint` | ESLint flat config with the repo's icon-barrel, inline-hex and `any` rules. |
| `pnpm format` / `pnpm format:check` | Prettier write / verify. |
| `pnpm check:catalog` | Exercise catalogue and media invariants. |
| `pnpm size:report` | Export size per platform, checked against `size-budget.json`. |

## Structure

- `app/` — Expo Router routes only: the five tabs (`index` Today, `workouts` Plan,
  `cardio`, `progress`, `you`), the full-screen `/nutrition` stack route, first-run
  `/onboarding`, the 404 and the web shell.
- `components/gymmate/` — route-agnostic design system; it never touches the store.
  Primitives come from the barrel `index.ts`, domain groups (`onboarding/`, `plan/`,
  `profile/`, `exercise/`, `nutrition/`) have their own barrels, and `today/` pieces
  are imported by path.
- `lib/gymmate/` — the domain. `types.ts` holds the persisted model, `GymAction` and
  `makeEmptySchedule`; `persistence.ts` is the `gymmate/v1` storage boundary
  (`loadPersisted` / `savePersisted`); `selectors.ts` is the pure derived reads;
  `store.tsx` is context, reducer and the re-exported public surface; `date.ts` is the
  calendar primitive leaf; `format.ts` formats display values and parses input;
  `nutrition.ts` is target and macro maths; `data.ts` is the generated exercise
  catalogue. Import the domain from `@/lib/gymmate/store` only.
- `constants/GymMateTheme.ts` — the single source of colour and typography tokens
  (`T`), plus the `MAX_CONTENT_WIDTH` / `SHEET_MAX_WIDTH` layout contract.
- `hooks/` — shared hooks. `scripts/` — catalogue check, size report, out-of-tree media
  converter. `assets/` — fonts and the bundled exercise stills and animations.

## Docs

- `PRODUCT.md` — the product authority: what GymMate is, the core loop and the
  non-negotiable rules.
- `DESIGN.md` — the visual system: tokens, layout widths, typography, components,
  accessibility and motion.
- `AGENTS.md` — engineering rules: stack discipline, project structure, conventions,
  navigation and EAS.
- `SIZE.md` — the measured bundle report and its guardrails.

## Data and media

Exercise metadata comes from `yuhonas/free-exercise-db` (Unlicense). The bundled WebP
stills and animations are © Gym visual — https://gymvisual.com/ and carry that credit in
the app. The licensing terms, including the 180×180 cap, are a product rule stated in
`PRODUCT.md`.

## Privacy

Everything stays on-device in AsyncStorage under `gymmate/v1`. There are no accounts, no
network calls and no telemetry.

## Licence

MIT — see `LICENSE`.
