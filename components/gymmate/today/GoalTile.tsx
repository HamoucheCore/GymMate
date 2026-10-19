/**
 * Today-only: goal progress tile.
 *
 * A `StatTile` cannot be tinted per goal, so this mirrors its geometry and adds
 * the progress bar. The percentage is `goalProgress()` from the frozen store —
 * when nothing has been weighed, it shows a dash rather than a fake 0%.
 */
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Card } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatKg } from '@/lib/gymmate/format';
import type { Profile } from '@/lib/gymmate/store';

export interface GoalTileProps {
  profile: Profile;
  /** Clamped 0..1 progress from start weight toward the target. */
  progress: number;
  /** Latest bodyweight in kg, or `null` when none has been logged. */
  latest: number | null;
}

export function GoalTile({ profile, progress, latest }: GoalTileProps) {
  const gaining = profile.goal === 'gain';
  const tint = gaining ? T.goalGain : T.goalLose;
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const hasWeight = latest !== null;

  const headline = hasWeight ? `${percent}%` : '—';
  const hint = hasWeight
    ? `Target ${formatKg(profile.targetWeight)} · now ${formatKg(latest)}`
    : `Target ${formatKg(profile.targetWeight)} · log a weight to track this`;

  return (
    <Card>
      <View
        accessible
        accessibilityLabel={`Goal: ${gaining ? 'gain' : 'lose'}. ${
          hasWeight ? `${percent} percent of the way to ${formatKg(profile.targetWeight)}.` : 'No weight logged yet.'
        }`}
        style={s.top}>
        <Text style={s.label}>{gaining ? 'Goal · Gain' : 'Goal · Lose'}</Text>
        <Text style={[s.value, hasWeight ? { color: tint } : s.valueIdle]}>{headline}</Text>
      </View>

      <View style={s.track} accessible={false}>
        <View style={[s.fill, { width: `${hasWeight ? percent : 0}%`, backgroundColor: tint }]} />
      </View>

      <Text style={s.hint}>{hint}</Text>
    </Card>
  );
}

const top: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
};
const label: TextStyle = { fontSize: 11, color: T.muted, letterSpacing: 0.4 };
const value: TextStyle = { fontSize: 22, color: T.ink, fontFamily: T.fontMonoBold };
const valueIdle: TextStyle = { color: T.muted };
const track: ViewStyle = {
  height: 8,
  borderRadius: 999,
  backgroundColor: T.barTrack,
  marginTop: 12,
  overflow: 'hidden',
};
const fill: ViewStyle = { height: '100%', borderRadius: 999 };
const hint: TextStyle = { fontSize: 11, color: T.muted, marginTop: 8, fontFamily: T.fontMono };

const s = StyleSheet.create({ top, label, value, valueIdle, track, fill, hint });
