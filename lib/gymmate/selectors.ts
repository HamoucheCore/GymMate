/**
 * Derived reads over `GymState` — pure functions, no React and no storage.
 *
 * Screens call these instead of recomputing streaks, weekly totals or
 * nutrition sums, so "this week" and "today" mean one thing everywhere. They
 * only depend on the domain model and the calendar primitives, which is why
 * they sit between `types.ts` and the provider in the module graph.
 */
import { startOfWeekISO, todayISO } from './date';
import { sumNutrition, type NutritionTotals } from './nutrition';
import type { BodyEntry, CardioRun, MealLog, Profile, WorkoutLog } from './types';

/** Stable-ish unique id. No crypto dependency (works in Expo Go + web). */
export function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Consecutive calendar days with at least one logged workout, counting back
 * from today. A streak also counts if the most recent log was yesterday
 * (today simply hasn't been logged *yet*).
 */
export function streakFromLogs(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const days = new Set<string>();
  for (const log of logs) days.add(log.date);
  if (days.size === 0) return 0;

  const cursor = new Date();
  if (!days.has(todayISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(todayISO(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(todayISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Total km run in the current week (Monday → today). */
export function weeklyCardioKm(runs: CardioRun[]): number {
  const start = startOfWeekISO();
  const total = runs.reduce((sum, run) => (run.date >= start ? sum + run.km : sum), 0);
  return Math.round(total * 10) / 10;
}

/** Workout count in the current week (Monday → today). */
export function logsThisWeek(logs: WorkoutLog[]): number {
  const start = startOfWeekISO();
  return logs.filter((log) => log.date >= start).length;
}

/** Most recent bodyweight in kg, or `null` when there is no measurement. */
export function latestWeight(entries: BodyEntry[]): number | null {
  let best: BodyEntry | null = null;
  for (const entry of entries) {
    if (!best || entry.date > best.date) best = entry;
  }
  return best ? best.kg : null;
}

/** Latest weight minus the profile's start weight, or `null` when unknown. */
export function weightDelta(profile: Profile | null, entries: BodyEntry[]): number | null {
  const latest = latestWeight(entries);
  if (!profile || latest === null) return null;
  return Math.round((latest - profile.startWeight) * 10) / 10;
}

/**
 * Clamped 0..1 progress from `startWeight` toward `targetWeight`.
 * Direction-aware: `lose` measures the drop from the start, `gain` the rise,
 * so an incoherent profile (a target on the wrong side of the start) returns 0
 * instead of an inverted bar.
 */
export function goalProgress(profile: Profile | null, entries: BodyEntry[]): number {
  const latest = latestWeight(entries);
  if (!profile || latest === null) return 0;
  const span =
    profile.goal === 'lose' ? profile.startWeight - profile.targetWeight : profile.targetWeight - profile.startWeight;
  if (span <= 0) return 0;
  const moved = profile.goal === 'lose' ? profile.startWeight - latest : latest - profile.startWeight;
  return clamp01(moved / span);
}

/**
 * Meals for one local date, newest first (by createdAt, then insertion order).
 *
 * `Array.prototype.sort` is stable, and the reducer already prepends, so equal
 * timestamps keep their insertion order instead of reshuffling on every render.
 */
export function mealsForDate(meals: readonly MealLog[], date: string): MealLog[] {
  return meals
    .filter((meal) => meal.date === date)
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) return 0;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
}

/** Summed calories/macros for one local date. */
export function nutritionTotalsForDate(meals: readonly MealLog[], date: string): NutritionTotals {
  return sumNutrition(mealsForDate(meals, date));
}
