# GymMate — Design System

How GymMate looks, moves and reads — as implemented. Follow it; audit against it. Product rules live in `PRODUCT.md`, engineering/stack rules in `AGENTS.md`.

## Tokens — one source of truth

**`constants/GymMateTheme.ts`** exports `GymMateTheme` (imported everywhere as `T`) and is the single source for colour and typography. It is the **only** `.ts`/`.tsx` file allowed to hold a hex value; the sole other exception is the raw CSS in the web shell `app/+html.tsx` (`theme-color`/`color-scheme` and the `body` background).

| Role | Token | Value | Used for |
| --- | --- | --- | --- |
| Background | `T.bg` | `#0D0C11` | App/screen background, tab bar, splash, adaptive icon. |
| Surface | `T.surface` | `#15131C` | Cards and panels. |
| Surface 2 | `T.surface2` | `#1C1926` | Nested/framed surfaces (steppers, media frames). |
| Sheet | `T.sheet` | `#14121B` | Bottom-sheet background. |
| Line | `T.line` | `#2A2638` | Hairline borders and dividers. |
| Ink | `T.ink` | `#EDE9E6` | Primary text. |
| Muted | `T.muted` | `#A29EAF` | Secondary/quiet text. |
| Label | `T.label` | `#C6C2D6` | Field labels and lead copy. |
| Accent | `T.accent` | `#B3A1FF` | The one lavender accent: active tab, focus, primary fills. |
| Accent ink | `T.accentInk` | `#150F2A` | Text/glyphs on an accent fill. |
| Pill bg | `T.pillBg` | `#201C30` | Pill/plate backgrounds. |
| Pill text | `T.pillText` | `#D6D1E8` | Text on pills/plates. |
| Plate bg | `T.plateBg` | `#231F36` | Weight-plate / tile backgrounds. |
| Bar track | `T.barTrack` | `#28243A` | Unfilled chart/bar track. |
| Check border | `T.checkBorder` | `#3A3450` | Checkbox/stepper control borders. |
| Danger | `T.danger` | `#FF9D9D` | Destructive text/icons. |
| Danger border | `T.dangerBorder` | `#3A2630` | Destructive button/border. |
| Success | `T.success` | `#9AD8BE` | Positive confirmation. |
| Goal — lose | `T.goalLose` | `#8E7BF0` | "Lose weight" goal accent. |
| Goal — gain | `T.goalGain` | `#C9A7F5` | "Gain weight" goal accent. |

`T.scrim` (`rgba(0,0,0,0.6)`) covers behind modals/sheets. `T.radius` (20) is the default corner radius.

**Rule: no inline hex anywhere in app or component code.** Import the token. If a colour is genuinely missing, add it to `GymMateTheme.ts`, never at the call site. `T.goalLose`/`T.goalGain` stay in the calm-purple family but must remain distinguishable from each other and from `T.accent`.

## Layout-width contract

Also exported from `constants/GymMateTheme.ts`:

- `MAX_CONTENT_WIDTH` (640) — caps content columns on tablets and desktop web.
- `SHEET_MAX_WIDTH` (640) — caps bottom sheets so they never stretch edge-to-edge on large screens.

**Import them; never invent a local width.** Every tab screen applies `MAX_CONTENT_WIDTH`; every bottom sheet (`ExerciseDetailSheet`, `WorkoutSheet`) applies `SHEET_MAX_WIDTH`.

## Typography

- **UI copy** uses the platform system sans (San Francisco / Roboto / Segoe) — read its qualms as "humanist sans". No UI font is bundled.
- **Numeric readouts** (stepper values, stat figures, chart labels, step counts) use one of three **subset JetBrains Mono** families, selected by family name via a `fontMono*` token:

  | Token | Family |
  | --- | --- |
  | `T.fontMono` | `JetBrainsMono` (Regular) |
  | `T.fontMonoMedium` | `JetBrainsMono-Medium` |
  | `T.fontMonoBold` | `JetBrainsMono-Bold` |

  The three weights are registered separately in `app/_layout.tsx`, so a style selects its weight **by family name and must not also set `fontWeight`**.

**Subsetting constraint:** the fonts under `assets/fonts/` are **subset** builds (~173 KB each, ~93% smaller than the Nerd-Font originals they replace). They are cut down out-of-tree to ASCII printable + Latin-1 Supplement + Latin Extended-A/B + General Punctuation + arrows/math + currency + `°×·—–…`. The Nerd-Font Private-Use-Area icon/Powerline ranges are **dropped** — the app never draws glyphs from a font. If the set of characters rendered in a `fontMono*` style ever grows, the subset must be regenerated (see `AGENTS.md`), or a glyph will render as tofu.

## Components

`components/gymmate/` is the route-agnostic design system. **It never touches the store** — components take plain values and callbacks; screens own state and dispatch.

- **`index.ts` barrel** — the shared primitives: `Card`, `SectionTitle`, `Pill`, `PrimaryButton`, `GhostButton`, `EmptyState`, `ScreenHeader`, `StatTile`, `NumberStepper`, `ExerciseRow`, `VolumeBars`. Import from `@/components/gymmate`.
- **Domain sub-barrels** (their own `index.ts`): `onboarding/` (`OnboardingProgress`, `StepTransition`, `GoalCard`, `OnboardingInput`, `RecapRow`, `PlateMark`), `plan/` (`WeekOverview`, `DayEditor`, `ExerciseList`, `ExercisePicker`), `profile/` (`GoalProgress`, `WeightTrend`, `EntryRow`, `ConfirmAction`, `goalLabel`, `memberSinceLabel`), `exercise/` (`ExerciseVisual`, `ExerciseDetailSheet`).
- **`today/`** pieces are imported by path (`GoalTile`, `LoggedTodayCard`, `WeekVolume`, `WorkoutSheet`).
- **`icons.ts`** is the icon registry — see Forbidden.

Every component: theme tokens only, strictly-typed props, 44pt+ targets.

## Media

- Every lift is drawn through **`ExerciseVisual`** — the one place that decides how an exercise renders. Callers pass a `size`, but the frame is clamped to the native resolution so the media is **never upscaled**.
- The bundled stills/animations are 180×180. That ceiling is enforced **in code** by **`MAX_MEDIA_PX` (180)** in `components/gymmate/exercise/ExerciseVisual.tsx`: `const side = Math.min(size, MAX_MEDIA_PX)`.
- **`ExerciseDetailSheet`** shows the animated **`gifUrl`** when a lift has one (the 137 `featured` lifts); otherwise the still. Same `MAX_MEDIA_PX` cap applies to its hero.
- If a source is somehow missing, `ExerciseVisual` renders a neutral themed plate (with the `exercise` icon) — never a broken image and never a vector stand-in.
- Licence terms (Unlicense metadata, © Gym visual media, the 180px cap, the required credit line) are a product rule — see `PRODUCT.md`.

## Accessibility bar

- **Semantic roles:** interactive rows are `Pressable` with meaningful `accessibilityRole` (`tab`, `checkbox`, `button`, `radiogroup`, `image`, `header`).
- **Labels *and* hints:** controls carry both — e.g. the "Edit profile" button has a `label` and an `accessibilityHint` explaining what opens.
- **44px minimum** touch targets everywhere.
- **Charts expose one real `summary` sentence** (via `accessibilityLabel`) rather than ambiguous individual bar labels — e.g. `VolumeBars`, `WeightTrend`.
- **Decorative media is hidden** from assistive tech: `ExerciseVisual` uses `decorative` to set `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` when the row already names the lift.
- **Bottom sheets** set `accessibilityViewIsModal` (`ExerciseDetailSheet`, `WorkoutSheet`) so focus stays inside the sheet.
- **Status changes are announced:** transient confirmations call `AccessibilityInfo.announceForAccessibility` (`app/(tabs)/index.tsx`).

## Motion

- Springs/tweens are **short and non-vestibular** — no large travel, no spins, no parallax.
- **Every animated surface honours `useReducedMotion()`** (`react-native-reanimated`) and falls back to a static/reduced state — see `GoalCard`, `StepTransition`, `OnboardingProgress`. New animation must do the same.
- Media cross-dissolves at 220 ms (`TRANSITION_MS` in `ExerciseVisual`) so late-arriving art does not pop.

## Styles (strict TS)

- `StyleSheet.create` collapses its unions, so **declare each style as `ViewStyle` / `TextStyle` first**, then pass the map to `StyleSheet.create({ … })`.
- **Weights are only `600` / `700` / `800`** — never `'650'` (invalid), and never `fontWeight` alongside a `fontMono*` family.
- **Never name a style `delete`** (reserved word).

## Forbidden

- **Unicode/emoji glyph icons** (`✓`, `✕`, `↑`, …). Every icon comes from the **`Icons`** registry in `components/gymmate/icons.ts` (backed by `lucide-react-native`, reached only through semantic keys), with `color` from `T` and a size from `ICON_SIZE`.
- **`any`** — strictly typed props and helpers.
- **Inline hex** — see Tokens.
- **Light-mode chrome** — `userInterfaceStyle` stays `"dark"`, `<StatusBar style="light" />` renders once in `app/_layout.tsx`; no `automatic`, no second palette.
