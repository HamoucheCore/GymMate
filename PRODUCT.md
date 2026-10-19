# GymMate — Product

The product authority for GymMate. If a change contradicts this file, the change is wrong, not the file. For engineering rules, stack and build commands see `AGENTS.md`; for the visual system see `DESIGN.md`.

## What it is

A **personal, dark-only strength-training tracker**. One person tracks their own lifts, cardio and bodyweight on their own device. Expo SDK 57 / React Native + Expo Router, targeting Android, iOS and web (`web.output: static`, shell at `app/+html.tsx`).

No account, no cloud. The onboarding promise is literal: *"No account, no cloud. Everything stays on this device."* (`app/onboarding.tsx`).

## Who it's for, and the core loop

Someone training on their own who wants a calm place to record what they actually did — not a coach, not a social feed.

1. Open the app → **first-run onboarding**: name, current and target weight (kg), and one goal — **lose** or **gain** (`app/onboarding.tsx`, `Profile` in `lib/gymmate/store.tsx`). The goal sets a direction, not a program.
2. Build **your own** weekly schedule in the **Plan** tab: name each day, mark it training or rest, add real lifts from the catalog.
3. **Log today's lifts** from the **Today** tab (sets × reps × kg) as you train.
4. Watch the **Progress** trend and weekly volume build from what you logged, and track **Cardio** runs alongside.

`RouteGate` in `app/_layout.tsx` enforces the loop: a profile-less install is sent to `/onboarding`, a profiled one to the tabs.

## The five tabs

| Tab | Route | Purpose |
| --- | --- | --- |
| **Today** | `app/(tabs)/index.tsx` | The front door. Greets you by name, shows `schedule[today]`, logs today's workout, and summarises streak, week volume, cardio and current weight — all read from the store. |
| **Plan** | `app/(tabs)/workouts.tsx` | The schedule builder. You own the week: name each day, set training vs. rest, add/remove real lifts from the catalog. |
| **Cardio** | `app/(tabs)/cardio.tsx` | Log and review runs (km, minutes, derived pace), with this week's km per day. |
| **Progress** | `app/(tabs)/progress.tsx` | Bodyweight log, trend sparkline and goal progress toward the target weight. |
| **You** | `app/(tabs)/you.tsx` | Profile, lifetime numbers, media credit, edit profile (`/onboarding?edit=1`) and reset-everything. |

## Non-negotiable product rules

These are load-bearing. Do not "improve" past them.

### 1. No mock, demo, template or seed data — ever

A brand-new install is `profile: null` with empty `schedule`/`logs`/`cardioRuns`/`bodyweights` (`createEmptyState`, `makeEmptySchedule` in `lib/gymmate/store.tsx`). A new user's schedule starts **empty**; the app never prescribes a program.

Every number on screen traces to something the user actually logged. **Where a value is not known, it is absent — never a plausible-looking guess:**

- `LibraryExercise.muscle`, `level`, `mechanic`, `category` and `instructions` are all **optional** for exactly this reason (`lib/gymmate/data.ts`): an absent value means *"not confidently known"*, not *"infer a default"*. The catalog is deliberately incomplete (e.g. only 1,045 of 1,324 lifts carry a `muscle` group).
- `formatKg` renders a dash (`'—'`) for a non-finite/absent weight rather than `'0.0 kg'` (`lib/gymmate/format.ts`), because a missing weight means *unknown*, not zero.
- The empty state is a first-class UI: `EmptyState` says what is missing and how to fill it, rather than showing placeholder figures.

When you extend the catalog or add a field, **omit** what you cannot source; do not invent it. `pnpm check:catalog` (`scripts/check-catalog.mjs`) enforces this: non-featured lifts must not carry `level`/`mechanic`/`category`/`instructions`, and every entry must name a file that exists on disk.

### 2. Dark-only, calm purple

There is one palette and it is dark. `userInterfaceStyle` is pinned `"dark"` in `app.json` (never `automatic`); there is no light mode, no second theme and no user-selected accent. The full token set lives in `constants/GymMateTheme.ts` (`T`) — see `DESIGN.md`.

### 3. User-built schedules

The user names their days and chooses their lifts. The app may offer the catalog and sane add-defaults (`DEFAULT_SETS`/`DEFAULT_REPS` in `workouts.tsx`), but it never hands down a program.

### 4. Real, licensed exercise media

- Metadata (muscle groups, equipment, instructions…) comes from **`yuhonas/free-exercise-db`**, released under the **Unlicense**.
- Media is **© Gym visual — https://gymvisual.com/**, hard-capped at **180×180** and redistributed under terms requiring that ceiling and the credit.
- The credit line `© Gym visual — https://gymvisual.com/` is **required** and already present in the exercise detail sheet and the You screen.
- Media is bundled locally: no hotlinks, no upscaling, never re-encode stills above 180×180.

### 5. Local-first

All state lives on-device in AsyncStorage under **`gymmate/v1`**; nothing leaves the device. There are no accounts, no network calls and no telemetry. A failed or corrupt read is preserved under `gymmate/v1.corrupt` and sets `persistable: false` so a bad read can never overwrite good data (`lib/gymmate/store.tsx`).

## Explicit non-goals

Out of scope on purpose — do not creep toward these without an explicit decision to change this file:

- **No social features** — no sharing, following, leaderboards or feeds.
- **No cloud sync or accounts** — no sign-in, no server, no cross-device state.
- **No program templates** — the app never ships a ready-made plan.
- **No i18n at this time** — copy is English-only; units are kilograms only (`Profile.unit: 'kg'`).
- **No analytics** — no tracking, no crash reporting that leaves the device.
