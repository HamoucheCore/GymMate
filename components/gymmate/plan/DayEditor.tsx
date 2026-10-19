import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { GhostButton } from '@/components/gymmate';
import type { ScheduleDay } from '@/lib/gymmate/store';

export interface DayEditorProps {
  day: ScheduleDay;
  /** False when the day is already a blank rest day — hides the clear action. */
  canClear: boolean;
  onFocusChange: (focus: string) => void;
  onToggleRest: (rest: boolean) => void;
  onClear: () => void;
  style?: StyleProp<ViewStyle>;
}

const FOCUS_PLACEHOLDER_TRAIN = 'Push, pull, legs, upper, lower, full body…';
const FOCUS_PLACEHOLDER_REST = 'Rest, mobility, easy cardio…';
const FOCUS_MAX_LENGTH = 24;

/** Explains the current mode, including what happens to lifts kept on a rest day. */
function modeHint(rest: boolean, count: number): string {
  if (!rest) return 'Lifts added below are scheduled for this day.';
  if (count === 0) return 'Recovery day — no lifts scheduled.';
  return `Recovery day. Your ${count === 1 ? 'lift is' : `${count} lifts are`} saved and run again when you switch back to Training.`;
}

/**
 * The selected day's name and type: a focus field plus a training ↔ rest
 * toggle. Deliberately slim — the week strip and the exercise list around it
 * carry the rest of the day. Expects to sit inside a `Card`.
 */
export function DayEditor({
  day,
  canClear,
  onFocusChange,
  onToggleRest,
  onClear,
  style,
}: DayEditorProps) {
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.fieldLabel}>Focus</Text>
      <TextInput
        value={day.focus}
        onChangeText={onFocusChange}
        placeholder={day.rest ? FOCUS_PLACEHOLDER_REST : FOCUS_PLACEHOLDER_TRAIN}
        placeholderTextColor={T.muted}
        selectionColor={T.accent}
        maxLength={FOCUS_MAX_LENGTH}
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Day focus"
        accessibilityHint="Names this day, for example Push or Legs"
        style={s.input}
      />

      <Text style={[s.fieldLabel, s.modeLabel]}>Type</Text>
      <View style={s.mode} accessibilityRole="radiogroup">
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: !day.rest }}
          accessibilityLabel="Training day"
          onPress={() => onToggleRest(false)}
          style={({ pressed }) => [
            s.segment,
            !day.rest ? s.segmentOn : null,
            pressed && day.rest ? s.segmentPressed : null,
          ]}>
          <Text style={[s.segmentText, !day.rest ? s.segmentTextOn : null]} numberOfLines={1}>
            Training
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: day.rest }}
          accessibilityLabel="Rest day"
          onPress={() => onToggleRest(true)}
          style={({ pressed }) => [
            s.segment,
            day.rest ? s.segmentOn : null,
            pressed && !day.rest ? s.segmentPressed : null,
          ]}>
          <Text style={[s.segmentText, day.rest ? s.segmentTextOn : null]} numberOfLines={1}>
            Rest
          </Text>
        </Pressable>
      </View>

      <Text style={s.hint}>{modeHint(day.rest, day.exercises.length)}</Text>

      {canClear ? (
        <GhostButton
          label="Clear day"
          tone="danger"
          fullWidth={false}
          onPress={onClear}
          accessibilityHint="Removes the focus and every lift from this day"
          style={s.clear}
        />
      ) : null}
    </View>
  );
}

const wrap: ViewStyle = { marginTop: 16, gap: 6 };
const fieldLabel: TextStyle = {
  fontSize: 12,
  fontWeight: '700',
  color: T.label,
  letterSpacing: 0.3,
};
const modeLabel: TextStyle = { marginTop: 12 };
const input: TextStyle = {
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 48,
  color: T.ink,
  fontSize: 15,
};
const mode: ViewStyle = {
  flexDirection: 'row',
  gap: 4,
  padding: 4,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
};
const segment: ViewStyle = {
  flex: 1,
  minHeight: 44,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 10,
};
const segmentOn: ViewStyle = { backgroundColor: T.accent };
const segmentPressed: ViewStyle = { backgroundColor: T.pillBg };
const segmentText: TextStyle = { fontSize: 14, fontWeight: '700', color: T.label };
const segmentTextOn: TextStyle = { color: T.accentInk };
const hint: TextStyle = { fontSize: 12, color: T.muted, lineHeight: 17 };
const clear: ViewStyle = { marginTop: 10 };

const s = StyleSheet.create({
  wrap,
  fieldLabel,
  modeLabel,
  input,
  mode,
  segment,
  segmentOn,
  segmentPressed,
  segmentText,
  segmentTextOn,
  hint,
  clear,
});
