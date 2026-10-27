/**
 * Nutrition domain — pure maths for the meal log, no React and no storage.
 *
 * This module is imported by `store.tsx` (for `sumNutrition`) and by screens.
 * It only takes *types* from the store, never a runtime import, so there is no
 * `store -> nutrition -> store` cycle at module-evaluation time. Keep it that
 * way: importing a value from `store.tsx` here would break hydration order.
 *
 * Everything is deterministic (no `Date`, no `Math.random`), so a rendered
 * target can be unit-checked by hand — see the 75 kg worked example below.
 */
import type { Goal, MealLog, Profile } from '@/lib/gymmate/store';

/* ------------------------------------------------------------------ types */

/** Where a meal sits in the day. Stored, so the order here is display order. */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** A plain calorie/macro sum — also the shape of a daily target. */
export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Daily targets derived from the profile goal and bodyweight. */
export interface NutritionTarget extends NutritionTotals {
  goal: Goal;
}

/* -------------------------------------------------------------- constants */

export const MEAL_SLOTS: readonly { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

/** Meal names are free text typed on a phone — cap them so a pasted essay
 *  can't blow out the row layout or the persisted blob. */
export const MEAL_NAME_MAX = 60;

/**
 * Hard input bounds for a single meal entry, shared by the form and the
 * persistence parser so the UI can never accept a value the loader would
 * silently reject (or vice versa).
 */
export const MEAL_LIMITS: {
  calories: { min: number; max: number };
  macros: { min: number; max: number };
} = {
  calories: { min: 0, max: 3000 },
  macros: { min: 0, max: 500 },
};

/* ---------------------------------------------------------------- helpers */

/** Narrow an unknown (a persisted blob, a route param) to a real slot. */
export function isMealSlot(value: unknown): value is MealSlot {
  return (
    value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack'
  );
}

/** `'snack'` -> `'Snack'`. Falls back to the raw key only if the union widens. */
export function mealSlotLabel(slot: MealSlot): string {
  const match = MEAL_SLOTS.find((entry) => entry.key === slot);
  return match ? match.label : slot;
}

/** A zeroed total — the reduce seed for `sumNutrition`. */
function emptyNutritionTotals(): NutritionTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

/** `NaN`/`Infinity` -> 0, negatives -> 0. */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Add up any list of meals.
 *
 * Tolerant on purpose: a non-finite field is treated as 0 and a negative is
 * clamped to 0, because a corrupt or hand-edited blob must never turn a day's
 * remaining calories into a negative or `NaN` bar. The result is *not*
 * rounded — display rounding belongs to `format.ts`.
 */
export function sumNutrition(meals: readonly MealLog[]): NutritionTotals {
  const totals = emptyNutritionTotals();
  for (const meal of meals) {
    totals.calories += nonNegative(meal.calories);
    totals.protein += nonNegative(meal.protein);
    totals.carbs += nonNegative(meal.carbs);
    totals.fat += nonNegative(meal.fat);
  }
  return totals;
}

/** Round to the nearest 5 — calories and grams are estimates, not lab values. */
function round5(value: number): number {
  return Math.round(value / 5) * 5;
}

/* ---------------------------------------------------------------- targets */

/**
 * Daily targets from the profile goal and bodyweight.
 *
 * This is a *transparent estimate*, not medical advice, and the maths is kept
 * deliberately simple because the profile stores no age, sex, height-based
 * BMR inputs or activity level — anything more precise would be fabricated
 * precision. So:
 *
 *   maintenance ≈ weightKg × 31 kcal   (a mid-range maintenance coefficient)
 *   calories     = gain ? maintenance + 300 : maintenance - 400
 *   calories    clamped to [1400, 4500] and rounded to the nearest 5
 *   protein      = round5(weight × (gain ? 1.8 : 2.0))   — higher in a deficit
 *                   to protect lean mass
 *   fat          = round5(max(40, calories × 0.25 / 9))  — 25 % of energy,
 *                   40 g floor keeps fat from collapsing on a low target
 *   carbs        = whatever energy is left, floored at 0 (4 kcal/g)
 *
 * `weightKg` (the latest bodyweight entry) wins when it is a usable number,
 * otherwise the profile's start weight is the fallback — always present, so a
 * profile alone always yields a target. No profile at all means no target:
 * the UI renders an "add your details" state rather than inventing numbers.
 *
 * Worked example (75 kg): lose -> 1925 kcal / 150 P / 210 C / 55 F;
 * gain -> 2625 kcal / 135 P / 355 C / 75 F.
 */
export function nutritionTargetFor(
  profile: Profile | null,
  weightKg: number | null,
): NutritionTarget | null {
  if (!profile) return null;

  const weight =
    weightKg !== null && Number.isFinite(weightKg) && weightKg > 0
      ? weightKg
      : profile.startWeight;
  // A nonsense start weight would produce nonsense targets; refuse cleanly.
  if (!Number.isFinite(weight) || weight <= 0) return null;

  const goal: Goal = profile.goal;
  const maintenance = weight * 31;
  const rawCalories = goal === 'gain' ? maintenance + 300 : maintenance - 400;
  const calories = round5(Math.min(4500, Math.max(1400, rawCalories)));

  const protein = round5(weight * (goal === 'gain' ? 1.8 : 2.0));
  const fat = round5(Math.max(40, (calories * 0.25) / 9));
  const carbs = round5(Math.max(0, (calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, goal };
}

/* --------------------------------------------------------------- progress */

/**
 * Clamped 0..1 fraction of a calorie target, for bar widths.
 * A missing or zero target returns 0 — an empty/unknown goal must not render
 * as a full or `Infinity`-wide bar.
 */
export function calorieProgress(value: number, target: number | null): number {
  return clampedRatio(value, target);
}

/** Same contract as `calorieProgress`, for the macro bars. */
export function macroProgress(value: number, target: number | null): number {
  return clampedRatio(value, target);
}

function clampedRatio(value: number, target: number | null): number {
  if (target === null || !Number.isFinite(target) || target <= 0) return 0;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, value / target);
}

/**
 * Calories left in the day. May be negative — going over is real information,
 * and the UI decides how to say it. `null` means "no target yet", which is a
 * different statement from "0 left".
 */
export function remainingCalories(
  totals: NutritionTotals,
  target: NutritionTarget | null,
): number | null {
  if (!target) return null;
  return Math.round(target.calories - totals.calories);
}
