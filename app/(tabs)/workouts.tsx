import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { GymMateTheme as T, MAX_CONTENT_WIDTH } from '@/constants/GymMateTheme';
import {
  Card,
  EmptyState,
  ExerciseDetailSheet,
  ScreenHeader,
  SectionTitle,
} from '@/components/gymmate';
import { DayEditor, ExerciseList, ExercisePicker, WeekOverview } from '@/components/gymmate/plan';
import { LIBRARY, findExerciseByName, type LibraryExercise } from '@/lib/gymmate/data';
import { plural } from '@/lib/gymmate/format';
import {
  WEEKDAYS,
  WEEKDAY_KEYS,
  makeId,
  todayKey,
  useGym,
  type ScheduleDay,
  type ScheduledExercise,
  type WeekdayKey,
} from '@/lib/gymmate/store';

/** Sane starting load for a lift the user just added. */
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;

/** 'Rest', a blank title, or whitespace all count as "not yet named". */
function isRestLabel(focus: string): boolean {
  const trimmed = focus.trim();
  return trimmed.length === 0 || trimmed.toLowerCase() === 'rest';
}

/** The focus a day should carry once its type changes. */
function focusForType(rest: boolean, focus: string): string {
  if (!rest) return isRestLabel(focus) ? '' : focus;
  return focus.trim().length > 0 ? focus : 'Rest';
}

/**
 * Plan — the schedule builder. The user owns the week: name each day, mark it
 * training or rest, and add real lifts from the catalog. Every change is
 * dispatched straight to the store, which persists it.
 */
export default function PlanScreen() {
  const { state, dispatch } = useGym();
  const today = useMemo(() => todayKey(), []);
  const [selected, setSelected] = useState<WeekdayKey>(today);
  const day = state.schedule[selected];
  // One sheet, opened either straight from the library picker or from a lift
  // already planned in this day (resolved back to its catalog entry).
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null);

  const trainingDays = WEEKDAY_KEYS.filter((key) => !state.schedule[key].rest).length;
  const restDays = WEEKDAY_KEYS.length - trainingDays;
  const summary = `${trainingDays} ${plural(trainingDays, 'training day', 'training days')} · ${restDays} ${plural(
    restDays,
    'rest day',
    'rest days',
  )}`;

  const addedNames = useMemo(() => day.exercises.map((exercise) => exercise.name), [day.exercises]);

  const selectedLabel = WEEKDAYS.find((weekday) => weekday.key === selected)?.label ?? 'Day';
  const todayShort = WEEKDAYS.find((weekday) => weekday.key === today)?.short ?? 'today';
  const canClear = !day.rest || day.exercises.length > 0 || !isRestLabel(day.focus);

  function commitDay(next: ScheduleDay) {
    dispatch({ type: 'SET_DAY', day: next });
  }

  function selectDay(key: string) {
    const match = WEEKDAY_KEYS.find((candidate) => candidate === key);
    if (match) setSelected(match);
  }

  function changeFocus(focus: string) {
    commitDay({ ...day, focus });
  }

  function toggleRest(rest: boolean) {
    commitDay({ ...day, rest, focus: focusForType(rest, day.focus) });
  }

  function clearDay() {
    dispatch({ type: 'CLEAR_DAY', key: selected });
  }

  function addExercise(exercise: LibraryExercise) {
    // Adding a lift never flips the day's type: DayEditor promises a rest day's
    // lifts are kept and run again once the day goes back to Training.
    commitDay({
      ...day,
      focus: day.rest || !isRestLabel(day.focus) ? day.focus : '',
      exercises: [
        ...day.exercises,
        {
          id: makeId('ex'),
          name: exercise.name,
          // A lift without a confidently-known group stores no `muscle` at all
          // rather than a stand-in label.
          ...(exercise.muscle ? { muscle: exercise.muscle } : {}),
          sets: DEFAULT_SETS,
          reps: DEFAULT_REPS,
        },
      ],
    });
  }

  function adjustSets(id: string, sets: number) {
    commitDay({
      ...day,
      exercises: day.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, sets } : exercise,
      ),
    });
  }

  function adjustReps(id: string, reps: number) {
    commitDay({
      ...day,
      exercises: day.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, reps } : exercise,
      ),
    });
  }

  function removeExercise(id: string) {
    commitDay({ ...day, exercises: day.exercises.filter((exercise) => exercise.id !== id) });
  }

  function moveExercise(id: string, direction: 'up' | 'down') {
    const index = day.exercises.findIndex((exercise) => exercise.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    const moved = day.exercises[index];
    if (!moved || index < 0 || target < 0 || target >= day.exercises.length) return;
    const next = day.exercises.filter((_, position) => position !== index);
    next.splice(target, 0, moved);
    commitDay({ ...day, exercises: next });
  }

  /**
   * A planned lift only stores its name, so resolve it against the catalog
   * before opening the sheet. A legacy or hand-typed name stays unresolved.
   */
  function previewScheduled(exercise: ScheduledExercise) {
    const library = findExerciseByName(exercise.name);
    if (library) setDetailExercise(library);
  }

  function startFirstDay() {
    setSelected(today);
    const entry = state.schedule[today];
    if (!entry.rest) return;
    commitDay({
      key: today,
      rest: false,
      focus: isRestLabel(entry.focus) ? '' : entry.focus,
      exercises: entry.exercises,
    });
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.column}>
          <ScreenHeader title="Plan" subtitle={summary} />

          {trainingDays === 0 ? (
            <EmptyState
              title="Build your week"
              body={`Pick a day, name its focus, then add lifts from the ${LIBRARY.length}-lift catalog. Every change saves as you make it.`}
              actionLabel={`Start with ${todayShort}`}
              onAction={startFirstDay}
              style={styles.intro}
            />
          ) : null}

          <SectionTitle title="Week" subtitle="Tap a day to edit it" style={styles.section} />
          <WeekOverview
            schedule={state.schedule}
            selectedKey={selected}
            todayKey={today}
            onSelectDay={selectDay}
          />

          <SectionTitle
            title="Day"
            subtitle={`${selectedLabel} · ${day.rest ? 'Rest day' : 'Training day'}`}
            style={styles.section}
          />
          <Card>
            <DayEditor
              day={day}
              canClear={canClear}
              onFocusChange={changeFocus}
              onToggleRest={toggleRest}
              onClear={clearDay}
            />
          </Card>

          <SectionTitle
            title="Exercises"
            subtitle={
              day.exercises.length === 0
                ? 'None yet — add lifts from the library below.'
                : undefined
            }
            style={styles.section}
          />
          <ExerciseList
            exercises={day.exercises}
            onAdjustSets={adjustSets}
            onAdjustReps={adjustReps}
            onRemove={removeExercise}
            onMove={moveExercise}
            onPreview={previewScheduled}
          />

          <SectionTitle
            title="Add from library"
            subtitle="Search a lift, or narrow it to one muscle."
            style={styles.section}
          />
          <ExercisePicker
            addedNames={addedNames}
            defaultSets={DEFAULT_SETS}
            defaultReps={DEFAULT_REPS}
            onAdd={addExercise}
            onPreview={setDetailExercise}
          />
        </View>
      </ScrollView>

      <ExerciseDetailSheet
        exercise={detailExercise}
        visible={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />
    </View>
  );
}

const safe: ViewStyle = { flex: 1, backgroundColor: T.bg };
const container: ViewStyle = { paddingHorizontal: 16, paddingBottom: 40, backgroundColor: T.bg };
// Phone-first: the column caps and centres itself on wide screens while the
// scroll content stays full-bleed so the background still fills the screen.
const column: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };
const intro: ViewStyle = { marginBottom: 4 };
const section: ViewStyle = { marginTop: 24 };

const styles = StyleSheet.create({ safe, container, column, intro, section });
