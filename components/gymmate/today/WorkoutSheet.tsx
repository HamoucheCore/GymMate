/**
 * Today-only: the slide-up set logger.
 *
 * Fully controlled — the screen owns the draft (which sets exist, what load and
 * reps they carry, whether they are logged). This component owns only the
 * ephemeral rest countdown. It never invents numbers: a set can only be logged
 * once a real weight is entered with the steppers.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExerciseVisual,
  GhostButton,
  Icons,
  ICON_SIZE,
  ICON_STROKE,
  NumberStepper,
  PrimaryButton,
} from '@/components/gymmate';
import { GymMateTheme as T, SHEET_MAX_WIDTH } from '@/constants/GymMateTheme';
import { findExerciseByName } from '@/lib/gymmate/data';
import { formatKg, joinParts, plural } from '@/lib/gymmate/format';
import type { ScheduledExercise } from '@/lib/gymmate/store';

export interface DraftSet {
  kg: number;
  reps: number;
  logged: boolean;
}

/** Working sets for the session, keyed by `ScheduledExercise.id`. */
export type SessionDraft = Record<string, DraftSet[]>;

/** Rest that starts automatically after a set is logged. */
const REST_SECONDS = 90;
/** Below this load a set has no meaningful weight to record. */
const MIN_LOADABLE_KG = 0.5;

export interface WorkoutSheetProps {
  visible: boolean;
  /** The day's focus, e.g. 'Push'. */
  focus: string;
  exercises: ScheduledExercise[];
  draft: SessionDraft;
  activeExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
  onChangeSets: (exerciseId: string, sets: DraftSet[]) => void;
  onClose: () => void;
  onFinish: () => void;
}

function formatClock(seconds: number): string {
  const m = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const s = `${seconds % 60}`.padStart(2, '0');
  return `${m}:${s}`;
}

export function WorkoutSheet({
  visible,
  focus,
  exercises,
  draft,
  activeExerciseId,
  onSelectExercise,
  onChangeSets,
  onClose,
  onFinish,
}: WorkoutSheetProps) {
  const insets = useSafeAreaInsets();
  const [restSecs, setRestSecs] = useState(0);
  const resting = restSecs > 0;

  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setRestSecs((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resting]);

  useEffect(() => {
    if (!visible) setRestSecs(0);
  }, [visible]);

  const activeExercise = useMemo(() => {
    const picks = exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0];
    return picks ?? null;
  }, [exercises, activeExerciseId]);

  const activeSets: DraftSet[] = activeExercise ? (draft[activeExercise.id] ?? []) : [];

  const totals = useMemo(() => {
    let planned = 0;
    let logged = 0;
    for (const exercise of exercises) {
      const sets = draft[exercise.id] ?? [];
      planned += sets.length;
      logged += sets.filter((set) => set.logged).length;
    }
    return { planned, logged };
  }, [exercises, draft]);

  function commitSets(sets: DraftSet[]) {
    if (!activeExercise) return;
    onChangeSets(activeExercise.id, sets);
  }

  function changeSet(index: number, patch: Partial<DraftSet>) {
    commitSets(activeSets.map((set, i) => (i === index ? { ...set, ...patch } : set)));
  }

  function toggleSet(index: number) {
    const next = activeSets.map((set, i) => (i === index ? { ...set, logged: !set.logged } : set));
    commitSets(next);
    if (next[index]?.logged) setRestSecs(REST_SECONDS);
  }

  function addSet() {
    if (!activeExercise) return;
    const last = activeSets[activeSets.length - 1];
    commitSets([
      ...activeSets,
      {
        kg: last?.kg ?? 0,
        reps: last?.reps ?? activeExercise.reps,
        logged: false,
      },
    ]);
  }

  const restLabel = resting
    ? `Resting · ${formatClock(restSecs)}`
    : `Rest ready · ${formatClock(REST_SECONDS)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close the set logger"
          onPress={onClose}
          style={s.scrim}
        />

        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={s.head}>
            <View style={s.headText}>
              <Text style={s.title} accessibilityRole="header">
                {focus} · logging
              </Text>
              <Text style={s.subtitle}>
                {totals.logged} of {totals.planned} {plural(totals.planned, 'set', 'sets')} logged
              </Text>
            </View>
            <GhostButton label="Close" fullWidth={false} onPress={onClose} />
          </View>

          {exercises.length > 1 ? (
            <View style={s.chipsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsScroll}>
                <View style={s.chips} accessibilityRole="tablist">
                  {exercises.map((exercise) => {
                    const sets = draft[exercise.id] ?? [];
                    const logged = sets.filter((set) => set.logged).length;
                    const active = activeExercise?.id === exercise.id;
                    const library = findExerciseByName(exercise.name);
                    return (
                      <Pressable
                        key={exercise.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${exercise.name}, ${logged} of ${sets.length} sets logged`}
                        onPress={() => onSelectExercise(exercise.id)}
                        style={({ pressed }) => [
                          s.chip,
                          active ? s.chipActive : null,
                          pressed && !active ? s.chipPressed : null,
                        ]}>
                        {library ? (
                          <ExerciseVisual
                            exercise={library}
                            size={24}
                            rounded={8}
                            decorative
                            style={s.chipFigure}
                          />
                        ) : null}
                        <Text
                          style={[s.chipText, active ? s.chipTextActive : null]}
                          numberOfLines={1}>
                          {exercise.name} · {logged}/{sets.length}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}>
            {activeExercise ? (
              <>
                <Text style={s.exerciseName}>{activeExercise.name}</Text>
                <Text style={s.exerciseMeta}>
                  {joinParts([
                    activeExercise.muscle,
                    `planned ${activeExercise.sets} × ${activeExercise.reps}`,
                  ])}
                </Text>

                {activeSets.map((set, index) => {
                  const ready = set.kg >= MIN_LOADABLE_KG;
                  return (
                    <View key={index} style={s.setCard}>
                      <View style={s.setHead}>
                        <Text style={s.setName}>Set {index + 1}</Text>
                        <Text
                          style={[s.setState, set.logged ? s.setStateOn : null]}
                          numberOfLines={1}>
                          {set.logged
                            ? `${formatKg(set.kg)} × ${set.reps}`
                            : ready
                              ? 'Tap to log'
                              : 'Enter load'}
                        </Text>
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: set.logged, disabled: !ready }}
                          accessibilityLabel={`Set ${index + 1}, ${formatKg(set.kg)} for ${set.reps} reps`}
                          accessibilityHint={
                            !ready
                              ? 'Enter a weight to log this set'
                              : set.logged
                                ? 'Tap to unlog this set'
                                : 'Tap to log this set'
                          }
                          disabled={!ready}
                          onPress={() => toggleSet(index)}
                          style={({ pressed }) => [
                            s.check,
                            set.logged ? s.checkOn : null,
                            !ready ? s.checkOff : null,
                            pressed && ready ? s.checkPressed : null,
                          ]}>
                          <Icons.check
                            color={set.logged ? T.accentInk : T.muted}
                            size={ICON_SIZE.md}
                            strokeWidth={ICON_STROKE}
                          />
                        </Pressable>
                      </View>

                      <View style={s.steppers}>
                        <NumberStepper
                          label="Weight"
                          unit="kg"
                          value={set.kg}
                          min={0}
                          max={500}
                          step={2.5}
                          precision={1}
                          onChange={(kg) => changeSet(index, { kg })}
                          style={s.stepper}
                        />
                        <NumberStepper
                          label="Reps"
                          value={set.reps}
                          min={0}
                          max={100}
                          step={1}
                          onChange={(reps) => changeSet(index, { reps })}
                          style={s.stepper}
                        />
                      </View>
                    </View>
                  );
                })}

                <GhostButton label="Add set" fullWidth={false} onPress={addSet} />
              </>
            ) : (
              <Text style={s.empty}>
                No exercises planned for today, so there is nothing to log yet.
              </Text>
            )}
          </ScrollView>

          <View style={s.footer}>
            <View style={s.restRow}>
              <Text style={s.rest}>{restLabel}</Text>
              {resting ? (
                <GhostButton label="Skip" fullWidth={false} onPress={() => setRestSecs(0)} />
              ) : null}
            </View>

            <View style={s.actions}>
              <GhostButton label="Cancel" onPress={onClose} style={s.actionSecondary} />
              <PrimaryButton
                label={`Finish · ${totals.logged} ${plural(totals.logged, 'set', 'sets')}`}
                disabled={totals.logged === 0}
                onPress={onFinish}
                accessibilityHint="Saves this session to today's log"
                style={s.actionPrimary}
              />
            </View>

            <Text style={s.note}>
              {totals.logged === 0
                ? 'Set the load with the steppers, then tap the circle to log a set.'
                : 'Logged sets are saved when you finish.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const root: ViewStyle = { flex: 1, justifyContent: 'flex-end' };
const scrim: ViewStyle = { flex: 1, backgroundColor: T.scrim };
const sheet: ViewStyle = {
  backgroundColor: T.sheet,
  borderColor: T.line,
  borderWidth: 1,
  borderBottomWidth: 0,
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  paddingHorizontal: 18,
  paddingTop: 18,
  maxHeight: '92%',
  width: '100%',
  maxWidth: SHEET_MAX_WIDTH,
  alignSelf: 'center',
};
const head: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 };
const headText: ViewStyle = { flex: 1, gap: 2 };
const title: TextStyle = { fontSize: 18, fontWeight: '800', color: T.ink, letterSpacing: -0.3 };
const subtitle: TextStyle = { fontSize: 12, color: T.muted, fontFamily: T.fontMono };

const chipsWrap: ViewStyle = { marginHorizontal: -18, marginBottom: 12 };
const chipsScroll: ViewStyle = { paddingHorizontal: 18 };
const chips: ViewStyle = { flexDirection: 'row', gap: 8, alignItems: 'center' };
const chip: ViewStyle = {
  backgroundColor: T.pillBg,
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 10,
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  maxWidth: 240,
};
const chipFigure: ViewStyle = { borderRadius: 8 };
const chipActive: ViewStyle = { backgroundColor: T.accent };
const chipPressed: ViewStyle = { opacity: 0.75 };
const chipText: TextStyle = {
  flexShrink: 1,
  fontSize: 12,
  color: T.pillText,
  fontFamily: T.fontMonoMedium,
};
const chipTextActive: TextStyle = { color: T.accentInk, fontFamily: T.fontMonoBold };

const body: ViewStyle = { flexShrink: 1 };
const bodyContent: ViewStyle = { paddingBottom: 4 };
const exerciseName: TextStyle = { fontSize: 15, fontWeight: '700', color: T.ink };
const exerciseMeta: TextStyle = {
  fontSize: 12,
  color: T.muted,
  marginTop: 2,
  marginBottom: 12,
  fontFamily: T.fontMono,
};
const empty: TextStyle = { fontSize: 13, color: T.muted };

const setCard: ViewStyle = {
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 16,
  padding: 12,
  gap: 10,
  marginBottom: 10,
};
const setHead: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 };
const setName: TextStyle = { fontSize: 13, color: T.ink, fontFamily: T.fontMonoBold };
const setState: TextStyle = {
  flex: 1,
  fontSize: 12,
  color: T.muted,
  textAlign: 'right',
  fontFamily: T.fontMono,
};
const setStateOn: TextStyle = { color: T.accent, fontFamily: T.fontMonoBold };
const check: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  borderWidth: 1.5,
  borderColor: T.checkBorder,
  alignItems: 'center',
  justifyContent: 'center',
};
const checkOn: ViewStyle = { backgroundColor: T.accent, borderColor: T.accent };
const checkOff: ViewStyle = { opacity: 0.45 };
const checkPressed: ViewStyle = { opacity: 0.75 };
const steppers: ViewStyle = { flexDirection: 'row', gap: 12 };
const stepper: ViewStyle = { flex: 1, minWidth: 0 };

const footer: ViewStyle = { marginTop: 14, gap: 10 };
const restRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 48,
};
const rest: TextStyle = { fontSize: 12, color: T.muted, fontFamily: T.fontMono };
const actions: ViewStyle = { flexDirection: 'row', alignItems: 'stretch', gap: 10 };
const actionSecondary: ViewStyle = { flex: 1 };
const actionPrimary: ViewStyle = { flex: 2 };
const note: TextStyle = { fontSize: 11, color: T.muted };

const s = StyleSheet.create({
  root,
  scrim,
  sheet,
  head,
  headText,
  title,
  subtitle,
  chipsWrap,
  chipsScroll,
  chips,
  chip,
  chipFigure,
  chipActive,
  chipPressed,
  chipText,
  chipTextActive,
  body,
  bodyContent,
  exerciseName,
  exerciseMeta,
  empty,
  setCard,
  setHead,
  setName,
  setState,
  setStateOn,
  check,
  checkOn,
  checkOff,
  checkPressed,
  steppers,
  stepper,
  footer,
  restRow,
  rest,
  actions,
  actionSecondary,
  actionPrimary,
  note,
});
