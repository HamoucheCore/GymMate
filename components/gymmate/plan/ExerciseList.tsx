import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import {
  ExerciseVisual,
  Icons,
  ICON_SIZE,
  ICON_STROKE,
  NumberStepper,
  type LucideIcon,
} from '@/components/gymmate';
import { findExerciseByName } from '@/lib/gymmate/data';
import { joinParts } from '@/lib/gymmate/format';
import type { ScheduledExercise } from '@/lib/gymmate/store';

export interface ExerciseListProps {
  exercises: ScheduledExercise[];
  onAdjustSets: (id: string, sets: number) => void;
  onAdjustReps: (id: string, reps: number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  /** Opens the detail sheet for a lift planned in this day. */
  onPreview?: (exercise: ScheduledExercise) => void;
  style?: StyleProp<ViewStyle>;
}

const MIN_SETS = 1;
const MAX_SETS = 20;
const MIN_REPS = 1;
const MAX_REPS = 60;

interface RowButtonProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** 44pt icon-scale control used for reorder and remove inside a lift row. */
function RowButton({
  icon: Icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  disabled = false,
  danger = false,
}: RowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.control,
        danger ? s.controlDanger : null,
        pressed && !disabled ? s.controlPressed : null,
        disabled ? s.controlDisabled : null,
      ]}>
      <Icon color={danger ? T.danger : T.label} size={ICON_SIZE.md} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

/**
 * The lifts planned for one day. Each row shows its sets × reps on the plate,
 * a sets/reps stepper pair, reorder arrows and a remove control. Renders
 * nothing when the day has no lifts.
 */
export function ExerciseList({
  exercises,
  onAdjustSets,
  onAdjustReps,
  onRemove,
  onMove,
  onPreview,
  style,
}: ExerciseListProps) {
  if (exercises.length === 0) return null;

  return (
    <View style={[s.list, style]}>
      {exercises.map((exercise, index) => {
        const first = index === 0;
        const last = index === exercises.length - 1;
        // The stored lift is { id, name, muscle?, sets, reps }; resolve the
        // full catalog entry so the row can carry a figure. Unresolved (a legacy
        // or hand-typed name) falls back to the plain sets × reps plate. The
        // muscle group is optional, so the label is joined from present parts.
        const library = findExerciseByName(exercise.name);
        const meta = joinParts([
          exercise.muscle,
          library ? `${exercise.sets} × ${exercise.reps}` : null,
        ]);

        return (
          <View key={exercise.id} style={s.item}>
            <View style={s.head}>
              {library ? (
                onPreview ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Preview ${exercise.name}`}
                    accessibilityHint="Opens the exercise details"
                    onPress={() => onPreview(exercise)}
                    style={({ pressed }) => [s.figure, pressed ? s.figurePressed : null]}>
                    <ExerciseVisual
                      exercise={library}
                      size={48}
                      rounded={14}
                      decorative
                    />
                  </Pressable>
                ) : (
                  <View style={s.figure}>
                    <ExerciseVisual
                      exercise={library}
                      size={48}
                      rounded={14}
                      decorative
                    />
                  </View>
                )
              ) : (
                <View style={s.plate}>
                  <Text
                    style={s.plateText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}>
                    {exercise.sets}×{exercise.reps}
                  </Text>
                </View>
              )}

              <View style={s.body}>
                <Text style={s.name} numberOfLines={2}>
                  {exercise.name}
                </Text>
                <Text style={s.detail} numberOfLines={1}>
                  {meta}
                </Text>
              </View>

              <View style={s.controls}>
                <RowButton
                  icon={Icons.moveUp}
                  accessibilityLabel={`Move ${exercise.name} up`}
                  accessibilityHint="Moves this lift earlier in the day"
                  disabled={first}
                  onPress={() => onMove(exercise.id, 'up')}
                />
                <RowButton
                  icon={Icons.moveDown}
                  accessibilityLabel={`Move ${exercise.name} down`}
                  accessibilityHint="Moves this lift later in the day"
                  disabled={last}
                  onPress={() => onMove(exercise.id, 'down')}
                />
                <RowButton
                  icon={Icons.remove}
                  accessibilityLabel={`Remove ${exercise.name}`}
                  accessibilityHint="Removes this lift from the day"
                  danger
                  onPress={() => onRemove(exercise.id)}
                />
              </View>
            </View>

            <View style={s.steppers}>
              <NumberStepper
                label="Sets"
                value={exercise.sets}
                min={MIN_SETS}
                max={MAX_SETS}
                onChange={(next) => onAdjustSets(exercise.id, next)}
                style={s.stepper}
              />
              <NumberStepper
                label="Reps"
                value={exercise.reps}
                min={MIN_REPS}
                max={MAX_REPS}
                onChange={(next) => onAdjustReps(exercise.id, next)}
                style={s.stepper}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const list: ViewStyle = { gap: 10 };
const item: ViewStyle = {
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: T.radius,
  padding: 12,
  gap: 12,
};
const head: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 10 };
const plate: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  backgroundColor: T.plateBg,
  borderColor: T.line,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 2,
};
const plateText: TextStyle = { fontSize: 12, fontFamily: T.fontMonoBold, color: T.accent };
// Same 48×48 footprint and radius as `plate`, so rows line up whether the
// catalog resolved the lift (image) or not (sets × reps plate). The visual
// draws its own border/background, so this slot adds neither.
const figure: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
};
const figurePressed: ViewStyle = { opacity: 0.7 };
const body: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const name: TextStyle = { fontSize: 14, fontWeight: '700', color: T.ink };
const detail: TextStyle = { fontSize: 12, fontFamily: T.fontMono, color: T.muted };
const controls: ViewStyle = { flexDirection: 'row', gap: 6 };
const control: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
  alignItems: 'center',
  justifyContent: 'center',
};
const controlDanger: ViewStyle = { borderColor: T.dangerBorder };
const controlPressed: ViewStyle = { backgroundColor: T.pillBg };
const controlDisabled: ViewStyle = { opacity: 0.35 };
const steppers: ViewStyle = { flexDirection: 'row', gap: 12 };
const stepper: ViewStyle = { flex: 1 };

const s = StyleSheet.create({
  list,
  item,
  head,
  plate,
  plateText,
  figure,
  figurePressed,
  body,
  name,
  detail,
  controls,
  control,
  controlDanger,
  controlPressed,
  controlDisabled,
  steppers,
  stepper,
});
