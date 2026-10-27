/**
 * GymMate's persisted domain model — every shape that reaches disk.
 *
 * `GymState` is the in-memory shape (hydration flags included); `PersistedState`
 * is the subset that is actually written, so a blob never carries a transient
 * flag. Both are plain data: no React, no storage calls, no clock.
 *
 * `date.ts` owns the calendar primitives (`WeekdayKey` among them) and this
 * module only borrows that one type, which keeps `types.ts` a leaf of the type
 * graph: `date` → `types` → `selectors`/`persistence` → `store`. Nothing here
 * may import from `store.tsx` or `nutrition.ts`, or the cycle comes back.
 */
import type { WeekdayKey } from './date';

// Re-exported so `@/lib/gymmate/store` can keep offering `WeekdayKey` with the
// rest of the domain types, exactly as it did before the split.
export type { WeekdayKey };

/* ------------------------------------------------------------------ types */

export type Goal = 'lose' | 'gain';

export interface Profile {
  name: string;
  unit: 'kg';
  startWeight: number;
  targetWeight: number;
  goal: Goal;
  heightCm?: number;
  createdAt: string; // ISO
}

export interface ScheduledExercise {
  id: string;
  name: string;
  /**
   * Coarse muscle label, e.g. 'Legs'. Optional because a scheduled lift may
   * legitimately have no confidently-known group — absent means "unknown",
   * never a fabricated default. Kept as a plain string (not the catalog's
   * `Muscle` union) so the persistence contract stays independent of the
   * generated catalog and tolerates labels written by a newer build.
   */
  muscle?: string;
  sets: number;
  reps: number;
}

export interface ScheduleDay {
  key: WeekdayKey;
  focus: string; // e.g. 'Push' — user editable
  rest: boolean;
  exercises: ScheduledExercise[];
}

export type Schedule = Record<WeekdayKey, ScheduleDay>;

export interface SetLog {
  kg: number;
  reps: number;
}

export interface WorkoutLog {
  id: string;
  dayKey: WeekdayKey;
  date: string; // ISO 'YYYY-MM-DD'
  focus: string;
  exercises: { name: string; sets: SetLog[] }[];
  completedAt: string; // ISO
}

export interface CardioRun {
  id: string;
  km: number;
  minutes: number;
  date: string; // ISO date
}

export interface BodyEntry {
  id: string;
  kg: number;
  date: string; // ISO date
}

/** Where a meal sits in the day. Stored, so the order here is display order. */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * One logged meal. Calories and the three macros are stored per entry (rather
 * than derived from a food database) because the tracker is a fast manual log —
 * the user types what they ate, and the totals are a plain sum.
 */
export interface MealLog {
  id: string;
  date: string; // local 'YYYY-MM-DD' (same convention as WorkoutLog.date)
  slot: MealSlot;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string; // ISO timestamp
}

export interface GymState {
  hydrated: boolean;
  /**
   * False when this session must never write to storage — the stored blob was
   * unreadable (a failed read or corrupt JSON) and was preserved under
   * `BACKUP_KEY` instead of being overwritten with an empty payload.
   */
  persistable: boolean;
  profile: Profile | null;
  schedule: Schedule;
  logs: WorkoutLog[];
  cardioRuns: CardioRun[];
  bodyweights: BodyEntry[];
  meals: MealLog[];
}

/** The slice of state that is written to disk. */
export interface PersistedState {
  profile: Profile | null;
  schedule: Schedule;
  logs: WorkoutLog[];
  cardioRuns: CardioRun[];
  bodyweights: BodyEntry[];
  meals: MealLog[];
}

/* ----------------------------------------------------------------- actions */

export type GymAction =
  | { type: 'HYDRATE'; state: Partial<GymState>; persistable: boolean }
  | { type: 'COMPLETE_ONBOARDING'; profile: Profile }
  | { type: 'UPDATE_PROFILE'; patch: Partial<Profile> }
  | { type: 'SET_DAY'; day: ScheduleDay }
  | { type: 'CLEAR_DAY'; key: WeekdayKey }
  | { type: 'ADD_LOG'; log: WorkoutLog }
  | { type: 'ADD_RUN'; run: CardioRun }
  | { type: 'REMOVE_RUN'; id: string }
  | { type: 'ADD_WEIGHT'; entry: BodyEntry }
  | { type: 'REMOVE_WEIGHT'; id: string }
  | { type: 'ADD_MEAL'; meal: MealLog }
  | { type: 'REMOVE_MEAL'; id: string }
  | { type: 'RESET_ALL' };

/* ----------------------------------------------------------------- helpers */

export function makeEmptySchedule(): Schedule {
  const restDay = (key: WeekdayKey): ScheduleDay => ({
    key,
    focus: 'Rest',
    rest: true,
    exercises: [],
  });
  return {
    mon: restDay('mon'),
    tue: restDay('tue'),
    wed: restDay('wed'),
    thu: restDay('thu'),
    fri: restDay('fri'),
    sat: restDay('sat'),
    sun: restDay('sun'),
  };
}

/** The one empty-state factory: `hydrated: false` on boot, `true` after a reset. */
export function createEmptyState(hydrated: boolean): GymState {
  return {
    hydrated,
    persistable: true,
    profile: null,
    schedule: makeEmptySchedule(),
    logs: [],
    cardioRuns: [],
    bodyweights: [],
    meals: [],
  };
}
