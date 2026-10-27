/**
 * The storage boundary — reading, validating and writing the `gymmate/v1` blob.
 *
 * Zero React in here on purpose: the provider owns the `cancelled` flag and the
 * dispatch, while this module owns everything that touches AsyncStorage. The
 * contract it enforces is the load-bearing part:
 *
 * - A failed read is not a licence to write: there is no blob to inspect, so
 *   the session stays read-only (`persistable: false`) rather than overwriting
 *   whatever is on disk with an empty payload.
 * - A blob that parses as anything other than a JSON object is copied to
 *   `gymmate/v1.corrupt` before the session goes read-only, so corrupt data is
 *   preserved instead of destroyed.
 * - Writes are fire-and-forget: storage is best-effort and must never break UI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isISODate, WEEKDAY_KEYS, type WeekdayKey } from './date';
import { isMealSlot, MEAL_LIMITS } from './nutrition';
import {
  makeEmptySchedule,
  type BodyEntry,
  type CardioRun,
  type GymState,
  type MealLog,
  type PersistedState,
  type Profile,
  type Schedule,
  type ScheduleDay,
  type ScheduledExercise,
  type SetLog,
  type WorkoutLog,
} from './types';

/* ------------------------------------------------------- persistence utils */

const STORAGE_KEY = 'gymmate/v1';

/** Where an unreadable blob is preserved so a corrupt read never destroys it. */
const BACKUP_KEY = 'gymmate/v1.corrupt';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function coerceScheduledExercise(value: unknown): ScheduledExercise | null {
  if (!isRecord(value)) return null;
  const { id, name, muscle, sets, reps } = value;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof sets !== 'number' || typeof reps !== 'number') return null;
  // `muscle` is optional: an absent group is valid, but a non-string is not.
  if (muscle !== undefined && typeof muscle !== 'string') return null;
  const exercise: ScheduledExercise = { id, name, sets, reps };
  if (typeof muscle === 'string') exercise.muscle = muscle;
  return exercise;
}

function coerceScheduleDay(value: unknown, key: WeekdayKey): ScheduleDay {
  const fallback: ScheduleDay = { key, focus: 'Rest', rest: true, exercises: [] };
  if (!isRecord(value)) return fallback;
  const focus =
    typeof value.focus === 'string' && value.focus.trim() ? value.focus : fallback.focus;
  const rest = typeof value.rest === 'boolean' ? value.rest : fallback.rest;
  const exercises: ScheduledExercise[] = [];
  if (isUnknownArray(value.exercises)) {
    for (const raw of value.exercises) {
      const parsed = coerceScheduledExercise(raw);
      if (parsed) exercises.push(parsed);
    }
  }
  return { key, focus, rest, exercises };
}

function coerceSchedule(value: unknown): Schedule {
  const source = isRecord(value) ? value : {};
  const next = makeEmptySchedule();
  for (const key of WEEKDAY_KEYS) {
    next[key] = coerceScheduleDay(source[key], key);
  }
  return next;
}

function coerceProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const { name, startWeight, targetWeight, goal, createdAt, heightCm } = value;
  if (typeof name !== 'string') return null;
  if (typeof startWeight !== 'number' || typeof targetWeight !== 'number') return null;
  return {
    name,
    unit: 'kg',
    startWeight,
    targetWeight,
    goal: goal === 'gain' ? 'gain' : 'lose',
    ...(typeof heightCm === 'number' ? { heightCm } : {}),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  };
}

function isWeekdayKey(value: unknown): value is WeekdayKey {
  return typeof value === 'string' && (WEEKDAY_KEYS as string[]).includes(value);
}

function coerceWorkoutLog(value: unknown): WorkoutLog | null {
  if (!isRecord(value)) return null;
  const { id, dayKey, date, focus, completedAt, exercises } = value;
  if (typeof id !== 'string' || typeof date !== 'string' || typeof completedAt !== 'string')
    return null;
  const parsedExercises: { name: string; sets: SetLog[] }[] = [];
  if (isUnknownArray(exercises)) {
    for (const raw of exercises) {
      if (!isRecord(raw)) continue;
      const name = raw.name;
      const sets: SetLog[] = [];
      if (isUnknownArray(raw.sets)) {
        for (const rawSet of raw.sets) {
          if (!isRecord(rawSet)) continue;
          const { kg, reps } = rawSet;
          if (typeof kg === 'number' && typeof reps === 'number') sets.push({ kg, reps });
        }
      }
      if (typeof name === 'string') parsedExercises.push({ name, sets });
    }
  }
  return {
    id,
    dayKey: isWeekdayKey(dayKey) ? dayKey : 'mon',
    date,
    focus: typeof focus === 'string' ? focus : 'Workout',
    exercises: parsedExercises,
    completedAt,
  };
}

function coerceRun(value: unknown): CardioRun | null {
  if (!isRecord(value)) return null;
  const { id, km, minutes, date } = value;
  if (typeof id !== 'string' || typeof date !== 'string') return null;
  if (typeof km !== 'number' || typeof minutes !== 'number') return null;
  return { id, km, minutes, date };
}

function coerceWeight(value: unknown): BodyEntry | null {
  if (!isRecord(value)) return null;
  const { id, kg, date } = value;
  if (typeof id !== 'string' || typeof date !== 'string' || typeof kg !== 'number') return null;
  return { id, kg, date };
}

/** Finite number clamped to `0..ceiling`, or `null` when it isn't a number. */
function coerceAmount(value: unknown, ceiling: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(Math.max(value, 0), ceiling);
}

/**
 * A meal is user-typed free text, so this is stricter than `coerceRun`: an
 * unknown slot or an unplaceable date drops the entry entirely, because a meal
 * that cannot be shown in a section or under a real day would be invisible but
 * still count towards the totals — silently wrong numbers are worse than a lost
 * row. The amounts use the same `MEAL_LIMITS` the form validates against, so the
 * parser accepts exactly what the form can produce; a value beyond those bounds
 * is clamped rather than dropped, because the row is still real food.
 */
function coerceMeal(value: unknown): MealLog | null {
  if (!isRecord(value)) return null;
  const { id, date, slot, name, calories, protein, carbs, fat, createdAt } = value;
  if (typeof id !== 'string' || !isISODate(date)) return null;
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) return null;
  if (typeof name !== 'string' || name.trim().length === 0) return null;
  if (!isMealSlot(slot)) return null;
  const kcal = coerceAmount(calories, MEAL_LIMITS.calories.max);
  const proteinG = coerceAmount(protein, MEAL_LIMITS.macros.max);
  const carbsG = coerceAmount(carbs, MEAL_LIMITS.macros.max);
  const fatG = coerceAmount(fat, MEAL_LIMITS.macros.max);
  if (kcal === null || proteinG === null || carbsG === null || fatG === null) return null;
  return {
    id,
    date,
    slot,
    name: name.trim(),
    calories: kcal,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
    createdAt,
  };
}

/** The result of reading a persisted blob: parsed state, or an explicit failure. */
type ParseResult = { ok: true; state: Partial<GymState> } | { ok: false };

/**
 * Parse a persisted blob into a partial state. Never throws.
 *
 * `ok` is true only when the raw text decoded to a JSON object; anything else
 * (unparseable text, a JSON scalar/array) is reported as a failure so the
 * caller can refuse to overwrite the possibly-recoverable blob.
 */
function parsePersisted(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!isRecord(parsed)) return { ok: false };

  const profile = coerceProfile(parsed.profile);
  const logs: WorkoutLog[] = [];
  const cardioRuns: CardioRun[] = [];
  const bodyweights: BodyEntry[] = [];
  const meals: MealLog[] = [];

  if (isUnknownArray(parsed.logs)) {
    for (const raw of parsed.logs) {
      const log = coerceWorkoutLog(raw);
      if (log) logs.push(log);
    }
  }
  if (isUnknownArray(parsed.cardioRuns)) {
    for (const raw of parsed.cardioRuns) {
      const run = coerceRun(raw);
      if (run) cardioRuns.push(run);
    }
  }
  if (isUnknownArray(parsed.bodyweights)) {
    for (const raw of parsed.bodyweights) {
      const entry = coerceWeight(raw);
      if (entry) bodyweights.push(entry);
    }
  }
  // `meals` is the newest collection: a blob written before nutrition existed
  // has no key at all. That is not corruption — it hydrates as `[]` with `ok`
  // still true, so an upgrade never freezes the app into read-only mode (which
  // is what a failed parse would do) and keeps writing the new field back.
  if (isUnknownArray(parsed.meals)) {
    // A duplicate id would collide as a React key and let one Delete remove two
    // rows; the second copy is already ambiguous, so it is skipped rather than
    // re-keyed. Nothing is regenerated — ids stay exactly as written.
    const seenMealIds = new Set<string>();
    for (const raw of parsed.meals) {
      const meal = coerceMeal(raw);
      if (!meal || seenMealIds.has(meal.id)) continue;
      seenMealIds.add(meal.id);
      meals.push(meal);
    }
  }

  return {
    ok: true,
    state: {
      profile,
      schedule: coerceSchedule(parsed.schedule),
      logs,
      cardioRuns,
      bodyweights,
      meals,
    },
  };
}

/** Preserve an unreadable blob under the backup key. Best-effort, never throws. */
function stashCorruptBlob(raw: string): void {
  AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => {
    // Losing the backup is acceptable; clobbering the live blob is not.
  });
}
function serialize(state: GymState): string {
  const payload: PersistedState = {
    profile: state.profile,
    schedule: state.schedule,
    logs: state.logs,
    cardioRuns: state.cardioRuns,
    bodyweights: state.bodyweights,
    meals: state.meals,
  };
  return JSON.stringify(payload);
}

/* ------------------------------------------------------------------- I/O */

/** Read once on mount. Never rejects; reports whether writing is safe. */
export async function loadPersisted(): Promise<{
  restored: Partial<GymState>;
  persistable: boolean;
}> {
  let restored: Partial<GymState> = {};
  let persistable = true;

  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // A failed read tells us nothing about what is on disk, so assume the
    // worst: never overwrite this session. There is no blob to back up.
    persistable = false;
  }

  if (persistable && raw) {
    const parsed = parsePersisted(raw);
    if (parsed.ok) {
      restored = parsed.state;
    } else {
      // Unreadable payload: keep the original under a backup key and stop
      // writing so the good-but-unparseable blob is never clobbered.
      stashCorruptBlob(raw);
      persistable = false;
    }
  }

  return { restored, persistable };
}

/** Fire-and-forget write. A failed write must never reach the UI. */
export function savePersisted(state: GymState): void {
  AsyncStorage.setItem(STORAGE_KEY, serialize(state)).catch(() => {
    // Storage is best-effort: a failed write must never break the UI.
  });
}
