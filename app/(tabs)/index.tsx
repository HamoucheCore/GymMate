/**
 * Today — the app's front door.
 *
 * Everything on this screen traces back to the store: the profile's name and
 * goal, `schedule[todayKey()]` for the plan, `logs` for the streak, the week
 * chart and the "logged today" state, plus `cardioRuns` / `bodyweights` for the
 * stat row. There is no seed data and no fabricated figure anywhere.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import {
  EmptyState,
  ExerciseRow,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  StatTile,
  Card,
} from '@/components/gymmate';
import { dayTitle } from '@/components/gymmate/plan';
import { TodayNutritionCard } from '@/components/gymmate/nutrition';
import { GoalTile } from '@/components/gymmate/today/GoalTile';
import { LoggedTodayCard } from '@/components/gymmate/today/LoggedTodayCard';
import { WeekVolume } from '@/components/gymmate/today/WeekVolume';
import { WorkoutSheet, type DraftSet, type SessionDraft } from '@/components/gymmate/today/WorkoutSheet';
import { GymMateTheme as T, MAX_CONTENT_WIDTH } from '@/constants/GymMateTheme';
import { findExerciseByName } from '@/lib/gymmate/data';
import { weekdayIndexFromISO } from '@/lib/gymmate/date';
import {
  formatKcal,
  formatKg,
  formatKm,
  formatSets,
  formatSigned,
  joinParts,
  plural,
} from '@/lib/gymmate/format';
import { calorieProgress, nutritionTargetFor } from '@/lib/gymmate/nutrition';
import {
  WEEKDAYS,
  WEEKDAY_KEYS,
  goalProgress,
  latestWeight,
  makeId,
  nutritionTotalsForDate,
  startOfWeekISO,
  streakFromLogs,
  todayISO,
  todayKey,
  useGym,
  weeklyCardioKm,
  weightDelta,
  type ScheduledExercise,
  type Schedule,
  type ScheduleDay,
  type WeekdayKey,
  type WorkoutLog,
} from '@/lib/gymmate/store';

/* ----------------------------------------------------------------- helpers */

function firstName(name: string | undefined): string {
  if (!name) return '';
  return name.trim().split(/\s+/)[0] ?? '';
}

function timeOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function labelFor(key: WeekdayKey): string {
  return WEEKDAYS.find((day) => day.key === key)?.label ?? '';
}

/** Latest load actually recorded per exercise name. Empty until the user logs. */
function rememberedWeights(logs: WorkoutLog[]): Record<string, number> {
  const found: Record<string, number> = {};
  for (const log of logs) {
    for (const exercise of log.exercises) {
      if (exercise.name in found) continue;
      const loads = exercise.sets.map((set) => set.kg).filter((kg) => Number.isFinite(kg) && kg > 0);
      if (loads.length > 0) found[exercise.name] = Math.max(...loads);
    }
  }
  return found;
}

/** One unlogged set per planned set, pre-filled with the plan's reps. */
function buildDraft(
  exercises: ScheduledExercise[],
  remembered: Record<string, number>,
): SessionDraft {
  const draft: SessionDraft = {};
  for (const exercise of exercises) {
    const reps = Math.max(0, Math.round(exercise.reps));
    const kg = remembered[exercise.name] ?? 0;
    const count = Math.max(1, Math.round(exercise.sets));
    draft[exercise.id] = Array.from({ length: count }, () => ({ kg, reps, logged: false }));
  }
  return draft;
}

/** The next non-rest day after `from`, wrapping into next week. */
function nextPlannedDay(schedule: Schedule, from: WeekdayKey): ScheduleDay | null {
  const start = WEEKDAY_KEYS.indexOf(from);
  for (let step = 1; step <= WEEKDAY_KEYS.length; step += 1) {
    const key = WEEKDAY_KEYS[(start + step) % WEEKDAY_KEYS.length];
    if (!key) continue;
    const day = schedule[key];
    if (!day.rest && day.exercises.length > 0) return day;
  }
  return null;
}

/* ------------------------------------------------------------------- screen */

export default function TodayScreen() {
  const { state, dispatch } = useGym();

  const now = new Date();
  const key = todayKey(now);
  const iso = todayISO(now);
  const day = state.schedule[key];
  const weekdayLabel = labelFor(key);
  const isTrainingDay = !day.rest && day.exercises.length > 0;
  /**
   * The day's honest label. A training day the user created but has not named
   * yet (`startFirstDay` seeds a blank focus) must never print an empty heading
   * or a dangling ` · ` — the same fallback the Plan tab uses.
   */
  const focusLabel = dayTitle(day.focus, day.rest);
  const hasAnyTrainingDay = WEEKDAY_KEYS.some((weekday) => {
    const scheduled = state.schedule[weekday];
    return !scheduled.rest && scheduled.exercises.length > 0;
  });

  const streak = streakFromLogs(state.logs);
  const name = firstName(state.profile?.name);
  const greeting = `Good ${timeOfDay(now)}${name ? `, ${name}` : ''}`;

  /* ----------------------------------------------------------- session draft */

  const remembered = useMemo(() => rememberedWeights(state.logs), [state.logs]);
  const [draftState, setDraftState] = useState<{ dayKey: WeekdayKey; sets: SessionDraft } | null>(
    null,
  );
  const draft = draftState && draftState.dayKey === key
    ? draftState.sets
    : buildDraft(day.exercises, remembered);

  function writeSets(exerciseId: string, sets: DraftSet[]) {
    setDraftState({ dayKey: key, sets: { ...draft, [exerciseId]: sets } });
  }

  const totals = useMemo(() => {
    let planned = 0;
    let logged = 0;
    for (const exercise of day.exercises) {
      const sets = draft[exercise.id] ?? [];
      planned += sets.length;
      logged += sets.filter((set) => set.logged).length;
    }
    return { planned, logged };
  }, [day.exercises, draft]);

  /* ----------------------------------------------------------------- sheet */

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  function openSheet(exerciseId?: string) {
    setActiveExerciseId(exerciseId ?? day.exercises[0]?.id ?? null);
    setSheetOpen(true);
  }

  function handleExercisePress(exercise: ScheduledExercise) {
    const sets = draft[exercise.id] ?? [];
    const complete = sets.length > 0 && sets.every((set) => set.logged);
    if (complete) {
      writeSets(exercise.id, sets.map((set) => ({ ...set, logged: false })));
      return;
    }
    openSheet(exercise.id);
  }

  const [toast, setToast] = useState<string | null>(null);
  /**
   * The saved-workout pill is the only confirmation, and it is purely visual.
   * `announcedToast` records what assistive tech has already been told so a
   * re-render with an unchanged message can never queue a duplicate
   * announcement; it resets when the pill hides, so the next save speaks again.
   */
  const announcedToast = useRef<string | null>(null);

  useEffect(() => {
    if (!toast) {
      announcedToast.current = null;
      return;
    }
    if (announcedToast.current !== toast) {
      announcedToast.current = toast;
      AccessibilityInfo.announceForAccessibility(toast);
    }
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  /* ------------------------------------------------------------- today's log */

  const todayLogs = useMemo(() => state.logs.filter((log) => log.date === iso), [state.logs, iso]);
  const alreadyLogged = todayLogs.length > 0;

  function finishWorkout() {
    const exercises = day.exercises
      .map((exercise) => ({
        name: exercise.name,
        sets: (draft[exercise.id] ?? [])
          .filter((set) => set.logged && set.kg > 0)
          .map((set) => ({ kg: set.kg, reps: set.reps })),
      }))
      .filter((exercise) => exercise.sets.length > 0);
    const setCount = exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
    if (setCount === 0) return;

    const log: WorkoutLog = {
      id: makeId('log'),
      dayKey: key,
      date: iso,
      focus: focusLabel,
      exercises,
      completedAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_LOG', log });
    setSheetOpen(false);
    setToast(
      `Saved ${focusLabel} · ${exercises.length} ${plural(exercises.length, 'exercise', 'exercises')} · ${setCount} ${plural(setCount, 'set', 'sets')}`,
    );
  }

  /* ------------------------------------------------------------ week + stats */

  const todayIndex = (now.getDay() + 6) % 7;

  const week = useMemo(() => {
    const start = startOfWeekISO();
    const sets = [0, 0, 0, 0, 0, 0, 0];
    let sessions = 0;
    for (const log of state.logs) {
      if (log.date < start) continue;
      const index = weekdayIndexFromISO(log.date);
      if (index < 0) continue;
      sessions += 1;
      const logged = log.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
      sets[index] = (sets[index] ?? 0) + logged;
    }
    let peak = 0;
    let peakIndex = -1;
    let total = 0;
    let activeDays = 0;
    sets.forEach((value, index) => {
      total += value;
      if (value > 0) activeDays += 1;
      if (value > peak) {
        peak = value;
        peakIndex = index;
      }
    });
    return {
      values: sets.map((value) => (peak > 0 ? Math.round((value / peak) * 100) : 0)),
      today: sets[todayIndex] ?? 0,
      sessions,
      total,
      activeDays,
      peak,
      peakIndex,
    };
  }, [state.logs, todayIndex]);

  const weekRuns = useMemo(() => {
    const start = startOfWeekISO();
    return state.cardioRuns.filter((run) => run.date >= start).length;
  }, [state.cardioRuns]);

  const latest = latestWeight(state.bodyweights);
  const delta = weightDelta(state.profile, state.bodyweights);
  const progress = goalProgress(state.profile, state.bodyweights);
  const cardioKm = weeklyCardioKm(state.cardioRuns);

  /* -------------------------------------------------------------- nutrition */

  const nutrition = useMemo(() => nutritionTotalsForDate(state.meals, iso), [state.meals, iso]);
  const nutritionTarget = nutritionTargetFor(state.profile, latest);
  const nutritionPercent = nutritionTarget
    ? Math.round(calorieProgress(nutrition.calories, nutritionTarget.calories) * 100)
    : null;

  const muscles = Array.from(
    new Set(
      day.exercises
        .map((exercise) => exercise.muscle)
        .filter(
          (muscle): muscle is string => typeof muscle === 'string' && muscle.length > 0,
        ),
    ),
  );

  const weekSummary =
    week.peak > 0
      ? `Today ${week.today} ${plural(week.today, 'set', 'sets')} · peak ${WEEKDAYS[week.peakIndex]?.short ?? ''} with ${week.peak} sets`
      : 'No sets logged this week yet — your first session fills this in.';

  const weekSectionSubtitle =
    week.total > 0
      ? `${week.sessions} ${plural(week.sessions, 'session', 'sessions')} · ${week.total} sets over ${week.activeDays} ${plural(week.activeDays, 'day', 'days')}`
      : 'Nothing logged yet this week';

  const nextDay = !isTrainingDay && hasAnyTrainingDay ? nextPlannedDay(state.schedule, key) : null;

  const streakPill = (
    <View
      accessible
      accessibilityLabel={
        streak > 0 ? `Current streak: ${streak} ${plural(streak, 'day', 'days')}` : 'No streak yet'
      }
      style={s.streak}>
      {streak > 0 ? <View style={s.streakDot} accessible={false} /> : null}
      <Text style={s.streakText}>
        {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
      </Text>
    </View>
  );

  if (!state.hydrated) {
    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.column}>
            <ScreenHeader title={greeting} subtitle="Loading your day…" />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.column}>
          <ScreenHeader
            title={greeting}
            subtitle={`${weekdayLabel} · ${isTrainingDay ? focusLabel : hasAnyTrainingDay ? 'Rest day' : 'No plan yet'}`}
            trailing={streakPill}
          />

          {alreadyLogged ? (
            <LoggedTodayCard
              logs={todayLogs}
              onLogAnother={
                isTrainingDay
                  ? () => {
                      setDraftState(null);
                      openSheet();
                    }
                  : undefined
              }
            />
          ) : null}

          {isTrainingDay ? (
            <>
              <SectionTitle
                title="Today's plan"
                subtitle={`${day.exercises.length} ${plural(day.exercises.length, 'exercise', 'exercises')} · ${totals.planned} ${plural(totals.planned, 'set', 'sets')}`}
                style={s.section}
              />

              <Card>
                <Text style={s.focus}>{focusLabel}</Text>
                {muscles.length > 0 ? <Text style={s.focusSub}>{muscles.join(' · ')}</Text> : null}

                <View style={s.pills}>
                  <Pill label={`${day.exercises.length} ${plural(day.exercises.length, 'exercise', 'exercises')}`} />
                  <Pill label={`${totals.planned} ${plural(totals.planned, 'set', 'sets')}`} />
                  {totals.logged > 0 ? (
                    <Pill label={`${totals.logged} logged`} tone="accent" />
                  ) : null}
                </View>

                {alreadyLogged ? null : (
                  <PrimaryButton
                    label={totals.logged > 0 ? 'Continue logging' : 'Log workout'}
                    onPress={() => openSheet()}
                    accessibilityHint="Opens the set logger for today's exercises"
                    style={s.cta}
                  />
                )}
              </Card>

              <View style={s.exercises}>
                {day.exercises.map((exercise) => {
                  const sets = draft[exercise.id] ?? [];
                  const logged = sets.filter((set) => set.logged).length;
                  const complete = sets.length > 0 && logged === sets.length;
                  const load = remembered[exercise.name];
                  // The planned lift only stores a name; resolving it swaps the
                  // left plate for the catalog figure. An unresolved name (legacy
                  // or hand-typed) keeps the plate, so the row never breaks.
                  const library = findExerciseByName(exercise.name);
                  return (
                    <ExerciseRow
                      key={exercise.id}
                      load={load !== undefined ? formatKg(load) : formatSets(exercise.sets, exercise.reps)}
                      name={exercise.name}
                      detail={joinParts([
                        exercise.muscle,
                        logged > 0
                          ? `${logged} of ${sets.length} sets logged`
                          : `plan ${formatSets(exercise.sets, exercise.reps)}`,
                      ])}
                      done={complete}
                      onToggle={() => handleExercisePress(exercise)}
                      exercise={library}
                      style={s.exerciseRow}
                    />
                  );
                })}
              </View>
            </>
          ) : (
            <EmptyState
              title={hasAnyTrainingDay ? 'Rest day' : 'No plan yet'}
              body={
                hasAnyTrainingDay
                  ? `Nothing scheduled for ${weekdayLabel}. Recovery is part of the plan.${
                      nextDay
                        ? ` Next session: ${labelFor(nextDay.key)} · ${dayTitle(nextDay.focus, nextDay.rest)}.`
                        : ''
                    }`
                  : 'Pick your training days and Today will fill itself in with the session you built.'
              }
              actionLabel={hasAnyTrainingDay ? 'Plan a session' : 'Build your plan'}
              onAction={() => router.push('/workouts')}
              style={s.section}
            />
          )}

          <SectionTitle
            title="Nutrition"
            subtitle={
              nutritionTarget
                ? `${formatKcal(nutrition.calories)} of ${formatKcal(nutritionTarget.calories)}`
                : 'No targets yet'
            }
            action={
              nutritionPercent === null ? undefined : (
                <Pill label={`${nutritionPercent}%`} tone="accent" />
              )
            }
            style={s.section}
          />
          <TodayNutritionCard
            totals={nutrition}
            target={nutritionTarget}
            goal={state.profile?.goal ?? 'lose'}
            onOpen={() => router.push('/nutrition')}
          />

          <SectionTitle title="This week" subtitle={weekSectionSubtitle} style={s.section} />
          <WeekVolume
            values={week.values}
            labels={WEEKDAYS.map((weekday) => weekday.short)}
            highlightIndex={todayIndex}
            summary={weekSummary}
          />

          <SectionTitle title="Progress" style={s.section} />
          <View style={s.statRow}>
            <StatTile
              label="Bodyweight"
              value={latest !== null ? formatKg(latest) : '—'}
              hint={
                latest === null
                  ? 'No weigh-ins yet'
                  : delta !== null
                    ? `${formatSigned(delta)} kg vs start`
                    : 'No comparison yet'
              }
            />
            <StatTile
              label="Cardio · week"
              value={state.cardioRuns.length > 0 ? formatKm(cardioKm) : '—'}
              hint={
                weekRuns > 0
                  ? `${weekRuns} ${plural(weekRuns, 'run', 'runs')} this week`
                  : 'No runs this week'
              }
            />
          </View>
          {state.profile ? (
            <View style={s.goalWrap}>
              <GoalTile profile={state.profile} progress={progress} latest={latest} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {isTrainingDay ? (
        <WorkoutSheet
          visible={sheetOpen}
          focus={focusLabel}
          exercises={day.exercises}
          draft={draft}
          activeExerciseId={activeExerciseId}
          onSelectExercise={setActiveExerciseId}
          onChangeSets={writeSets}
          onClose={() => setSheetOpen(false)}
          onFinish={finishWorkout}
        />
      ) : null}

      {toast ? (
        <View style={s.toast} accessible accessibilityRole="alert">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ styles */

const root: ViewStyle = { flex: 1, backgroundColor: T.bg };
const content: ViewStyle = { paddingHorizontal: 16, paddingBottom: 40, backgroundColor: T.bg };
// Phone-first layout: the content column stops growing past `MAX_CONTENT_WIDTH`
// so iPad and desktop web centre it instead of stretching it edge to edge. The
// scroll content itself stays full-bleed so the background still fills.
const column: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };
const section: ViewStyle = { marginTop: 22 };

const streak: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: 12,
  minHeight: 36,
  justifyContent: 'center',
};
const streakDot: ViewStyle = { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent };
const streakText: TextStyle = { fontSize: 12, color: T.ink, fontFamily: T.fontMonoMedium };

const focus: TextStyle = { fontSize: 26, fontWeight: '800', color: T.ink, letterSpacing: -0.7 };
const focusSub: TextStyle = { fontSize: 13, color: T.muted, marginTop: 4 };
const pills: ViewStyle = { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 };
const cta: ViewStyle = { marginTop: 16 };
const exercises: ViewStyle = { marginTop: 12 };
const exerciseRow: ViewStyle = { marginBottom: 8 };

const statRow: ViewStyle = { flexDirection: 'row', gap: 10 };
const goalWrap: ViewStyle = { marginTop: 10 };

const toast: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 24,
  alignItems: 'center',
  // Keeps the pill off the screen edges when the message wraps at large
  // accessibility text sizes.
  paddingHorizontal: 24,
  pointerEvents: 'none',
};
const toastText: TextStyle = {
  backgroundColor: T.accent,
  color: T.accentInk,
  paddingHorizontal: 16,
  paddingVertical: 11,
  borderRadius: 999,
  fontSize: 13,
  overflow: 'hidden',
  textAlign: 'center',
  fontFamily: T.fontMono,
};

const s = StyleSheet.create({
  root,
  content,
  column,
  section,
  streak,
  streakDot,
  streakText,
  focus,
  focusSub,
  pills,
  cta,
  exercises,
  exerciseRow,
  statRow,
  goalWrap,
  toast,
  toastText,
});
