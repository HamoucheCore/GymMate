/**
 * GymMate global state — the React provider layer, and the app's single public
 * entry point for the domain model.
 *
 * This file used to also own the model, the persisted-blob parser and every
 * derived read. Those concerns now live in their own modules: `types.ts` (the
 * model and its constructors), `persistence.ts` (the AsyncStorage boundary and
 * the hydration/write effects) and `selectors.ts` (pure derived reads). What is
 * left here is context + reducer, and it re-exports the whole previous surface
 * below so no call site had to change.
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
 * keep importing them from this module, exactly as before the split.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import { loadPersisted, savePersisted } from './persistence';
import { createEmptyState, type GymAction, type GymState } from './types';

/* --------------------------------------------------------------- re-exports */

export type {
  BodyEntry,
  CardioRun,
  Goal,
  GymAction,
  GymState,
  MealLog,
  PersistedState,
  Profile,
  Schedule,
  ScheduleDay,
  ScheduledExercise,
  SetLog,
  WeekdayKey,
  WorkoutLog,
} from './types';
export { WEEKDAYS, WEEKDAY_KEYS, todayISO, todayKey, startOfWeekISO } from './date';
export { makeEmptySchedule } from './types';
export {
  goalProgress,
  latestWeight,
  logsThisWeek,
  makeId,
  mealsForDate,
  nutritionTotalsForDate,
  streakFromLogs,
  weeklyCardioKm,
  weightDelta,
} from './selectors';

/* ----------------------------------------------------------------- reducer */

const initialGymState: GymState = createEmptyState(false);

function gymReducer(state: GymState, action: GymAction): GymState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state, hydrated: true, persistable: action.persistable };

    case 'COMPLETE_ONBOARDING':
      return { ...state, profile: action.profile, hydrated: true };

    case 'UPDATE_PROFILE':
      // No profile yet -> nothing to patch. Use COMPLETE_ONBOARDING for that.
      return state.profile ? { ...state, profile: { ...state.profile, ...action.patch } } : state;

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
  // `persistable` records whether it is safe to write this session. The
  // `cancelled` flag stays here so a late read cannot dispatch after unmount.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const { restored, persistable } = await loadPersisted();
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
    savePersisted(state);
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
