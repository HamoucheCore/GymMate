import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatKg } from '@/lib/gymmate/format';
import type { Goal } from '@/lib/gymmate/store';

export interface GoalProgressProps {
  /** Clamped 0..1 value from `goalProgress()` in the store. */
  value: number;
  goal: Goal;
  startWeight: number;
  targetWeight: number;
  /** Latest real weigh-in, or `null` when there is none yet. */
  currentWeight: number | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Start → goal bar tinted by the profile's goal (`goalLose` / `goalGain`).
 * Purely presentational: it never invents a weight, and says so in words
 * when there is no measurement to compare against.
 */
export function GoalProgress({
  value,
  goal,
  startWeight,
  targetWeight,
  currentWeight,
  style,
}: GoalProgressProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const percent = Math.round(Math.min(1, Math.max(0, safe)) * 100);
  const gain = goal === 'gain';

  let note: string;
  if (currentWeight === null) {
    note = 'Add a weigh-in to see how close you are.';
  } else {
    // Positive = still to go, negative = already past the target for this goal.
    const remaining = gain ? targetWeight - currentWeight : currentWeight - targetWeight;
    if (Math.abs(remaining) < 0.05) {
      note = 'You are at your goal — keep it steady.';
    } else if (remaining < 0) {
      note = `Goal reached · ${formatKg(Math.abs(remaining))} past goal`;
    } else {
      note = `${formatKg(remaining)} to go`;
    }
  }

  return (
    <View style={[s.wrap, style]}>
      <View style={s.head}>
        <Text style={s.headLabel}>Goal progress</Text>
        <Text style={[s.percent, gain ? s.textGain : s.textLose]}>{percent}%</Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Goal progress"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={s.track}>
        <View style={[s.fill, gain ? s.fillGain : s.fillLose, { width: `${percent}%` }]} />
      </View>

      <View style={s.ends}>
        <Text style={s.end}>{`${formatKg(startWeight)} start`}</Text>
        <Text style={s.end}>{`${formatKg(targetWeight)} goal`}</Text>
      </View>

      <Text style={s.note}>{note}</Text>
    </View>
  );
}

const wrap: ViewStyle = { gap: 10 };
const head: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
};
const headLabel: TextStyle = { fontSize: 13, fontWeight: '700', color: T.label };
const percent: TextStyle = { fontSize: 18, fontFamily: T.fontMonoBold };
const textLose: TextStyle = { color: T.goalLose };
const textGain: TextStyle = { color: T.goalGain };
const track: ViewStyle = {
  height: 10,
  borderRadius: 999,
  backgroundColor: T.barTrack,
  overflow: 'hidden',
};
const fill: ViewStyle = { height: '100%', borderRadius: 999 };
const fillLose: ViewStyle = { backgroundColor: T.goalLose };
const fillGain: ViewStyle = { backgroundColor: T.goalGain };
const ends: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', gap: 12 };
const end: TextStyle = { fontSize: 11, color: T.muted, fontFamily: T.fontMono };
const note: TextStyle = { fontSize: 12, color: T.label, fontFamily: T.fontMono };

const s = StyleSheet.create({
  wrap,
  head,
  headLabel,
  percent,
  textLose,
  textGain,
  track,
  fill,
  fillLose,
  fillGain,
  ends,
  end,
  note,
});
