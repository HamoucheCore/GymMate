/**
 * GymMate global state — the frozen contract every screen builds against.
 *
 * - Zero seed/mock data. A brand-new install is `profile: null` + empty arrays.
 * - Everything is persisted to AsyncStorage under `gymmate/v1` after hydration.
 * - All reducer cases are immutable; collections are newest-first.
 * - Meals are dated with the same local `YYYY-MM-DD` as workout logs, so
 *   "today" means the same day for training and nutrition.
 * - A failed read or corrupt blob is preserved under `gymmate/v1.corrupt` and
 *   sets `persistable: false`, so a bad read can never overwrite good data.
 *
 * Types, action names and helper exports are intentionally stable. Screens
 * import them from '@/lib/gymmate/store'.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import {
  isMealSlot,
  MEAL_LIMITS,
  sumNutrition,
  type MealSlot,
  type NutritionTotals,
} from '@/lib/gymmate/nutrition';

/* ------------------------------------------------------------------ types */

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
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

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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

function createEmptyState(hydrated: boolean): GymState {
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

/** Local (not UTC) date as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Real local weekday of "now". */
export function todayKey(now: Date = new Date()): WeekdayKey {
  const map: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[now.getDay()] ?? 'mon';
}

/** Monday of the week containing `now`, as a local `YYYY-MM-DD`. */
export function startOfWeekISO(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return todayISO(d);
}

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

/**
 * A real local calendar date in `YYYY-MM-DD` form.
 *
 * The shape check alone is not enough: `2026-02-31` or `2026-13-40` matches the
 * pattern but would roll over silently and leave a meal that can never be
 * displayed for any real day, so the parts are rebuilt through `Date` and must
 * round-trip unchanged before the string is trusted as a day key.
 */
function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1] ?? '');
  const month = Number(match[2] ?? '');
  const day = Number(match[3] ?? '');
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
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
  const focus = typeof value.focus === 'string' && value.focus.trim() ? value.focus : fallback.focus;
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
  if (typeof id !== 'string' || typeof date !== 'string' || typeof completedAt !== 'string') return null;
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

/* ----------------------------------------------------------------- reducer */

export const initialGymState: GymState = createEmptyState(false);

export function gymReducer(state: GymState, action: GymAction): GymState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state, hydrated: true, persistable: action.persistable };

    case 'COMPLETE_ONBOARDING':
      return { ...state, profile: action.profile, hydrated: true };

    case 'UPDATE_PROFILE':
      // No profile yet -> nothing to patch. Use COMPLETE_ONBOARDING for that.
      return state.profile
        ? { ...state, profile: { ...state.profile, ...action.patch } }
        : state;

    case 'SET_DAY':
      return {
        ...state,
        schedule: { ...state.schedule, [action.day.key]: action.day },
      };

    case 'CLEAR_DAY':
      return {
        ...state,
        schedule: {
          ...state.schedule,
          [action.key]: { key: action.key, focus: 'Rest', rest: true, exercises: [] },
        },
      };

    case 'ADD_LOG':
      return { ...state, logs: [action.log, ...state.logs] };

    case 'ADD_RUN':
      return { ...state, cardioRuns: [action.run, ...state.cardioRuns] };

    case 'REMOVE_RUN':
      return { ...state, cardioRuns: state.cardioRuns.filter((run) => run.id !== action.id) };

    case 'ADD_WEIGHT':
      return { ...state, bodyweights: [action.entry, ...state.bodyweights] };

    case 'REMOVE_WEIGHT':
      return { ...state, bodyweights: state.bodyweights.filter((entry) => entry.id !== action.id) };

    case 'ADD_MEAL':
      return { ...state, meals: [action.meal, ...state.meals] };

    case 'REMOVE_MEAL':
      return { ...state, meals: state.meals.filter((meal) => meal.id !== action.id) };

    case 'RESET_ALL':
      return createEmptyState(true);

    default:
      return state;
  }
}

/* ---------------------------------------------------------------- context */

const GymContext = createContext<{ state: GymState; dispatch: Dispatch<GymAction> } | undefined>(
  undefined,
);

export function GymMateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gymReducer, initialGymState);

  // Hydrate once on mount. Always finishes hydrated (even on error/empty);
  // `persistable` records whether it is safe to write this session.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
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

      if (!cancelled) dispatch({ type: 'HYDRATE', state: restored, persistable });
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist user data on every relevant change, once hydrated — and only when
  // hydration succeeded, so a corrupt read can never be written back as empty.
  useEffect(() => {
    if (!state.hydrated || !state.persistable) return;
    AsyncStorage.setItem(STORAGE_KEY, serialize(state)).catch(() => {
      // Storage is best-effort: a failed write must never break the UI.
    });
  }, [
    state.hydrated,
    state.persistable,
    state.profile,
    state.schedule,
    state.logs,
    state.cardioRuns,
    state.bodyweights,
    state.meals,
  ]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym(): { state: GymState; dispatch: Dispatch<GymAction> } {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym must be used within GymMateProvider');
  return ctx;
}
