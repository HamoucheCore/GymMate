import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatDateLabel, formatKg } from '@/lib/gymmate/format';
import type { BodyEntry } from '@/lib/gymmate/store';

export interface WeightTrendProps {
  /** Store order (newest first). Drawn oldest → newest, capped at `limit`. */
  entries: BodyEntry[];
  limit?: number;
  /** Plot height in pt, excluding the date ticks. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const MIN_BAR = 8;

/**
 * Bar sparkline of the real weigh-in series. Bars are scaled to the observed
 * range (not to zero) so a 0.5 kg shift stays readable — the head row prints
 * the actual oldest/latest values, so the scaling can never mislead.
 *
 * Renders `null` for fewer than two entries: one point is not a trend.
 */
export function WeightTrend({ entries, limit = 10, height = 128, style }: WeightTrendProps) {
  const shown = entries.slice(0, Math.max(2, limit)).slice().reverse();
  if (shown.length < 2) return null;

  const values = shown.map((entry) => entry.kg);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 0.2);
  const floor = low - span * 0.35;
  const newest = shown.length - 1;

  return (
    <View style={style}>
      <View style={s.head}>
        <Text style={s.headText}>{`oldest ${formatKg(values[0] ?? low)}`}</Text>
        <Text style={s.headText}>{`latest ${formatKg(values[newest] ?? high)}`}</Text>
      </View>

      <View style={[s.plot, { height }]}>
        {shown.map((entry, i) => {
          const ratio = (entry.kg - floor) / (high - floor);
          const barHeight = Math.max(MIN_BAR, Math.round(ratio * height));
          const isNewest = i === newest;
          return (
            <View
              key={entry.id}
              accessible
              accessibilityLabel={`${formatDateLabel(entry.date)}: ${formatKg(entry.kg)}`}
              style={s.col}>
              <View style={[s.bar, { height: barHeight }, isNewest ? s.barNewest : null]} />
              <Text style={[s.tick, isNewest ? s.tickNewest : null]} numberOfLines={1}>
                {entry.date.slice(8, 10)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const head: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 10,
};
const headText: TextStyle = { fontSize: 11, color: T.muted, fontFamily: T.fontMono };
const plot: ViewStyle = { flexDirection: 'row', alignItems: 'flex-end', gap: 6 };
const col: ViewStyle = { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 };
const bar: ViewStyle = { width: '100%', backgroundColor: T.barTrack, borderRadius: 8 };
const barNewest: ViewStyle = { backgroundColor: T.accent };
const tick: TextStyle = { fontSize: 10, color: T.muted, fontFamily: T.fontMono };
const tickNewest: TextStyle = { color: T.accent, fontFamily: T.fontMonoMedium };

const s = StyleSheet.create({ head, headText, plot, col, bar, barNewest, tick, tickNewest });
