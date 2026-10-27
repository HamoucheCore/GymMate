import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface VolumeBarsProps {
  /** One value per bar. Scale is 0..100 (percent of the tallest bar). */
  values: number[];
  /** One label per bar, e.g. the Mon..Sun initials. */
  labels: string[];
  /** Bar to render in accent — the caller's real current weekday, Monday = 0. */
  highlightIndex: number;
  /**
   * One real sentence describing the chart (e.g. per-day kilometres). Announced
   * in place of the ambiguous single-letter labels, which are hidden from
   * assistive tech whenever this is given.
   */
  summary?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = 146;
const PLOT_PADDING = 40;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Weekly volume chart: one bar per day, with the caller's current day
 * highlighted. Presentational only — it never reads the clock itself.
 */
export function VolumeBars({ values, labels, highlightIndex, summary, style }: VolumeBarsProps) {
  const plotHeight = Math.max(24, HEIGHT - PLOT_PADDING);
  const described = summary !== undefined;

  return (
    <View
      style={[s.bars, { height: HEIGHT }, style]}
      accessible={described ? true : undefined}
      accessibilityRole={described ? 'image' : undefined}
      accessibilityLabel={summary}>
      {values.map((value, i) => {
        const percent = clampPercent(value);
        const barHeight = Math.max(6, (percent / 100) * plotHeight);
        const isActive = i === highlightIndex;
        return (
          <View key={`${labels[i] ?? 'd'}-${i}`} style={s.col}>
            <View
              accessible={false}
              style={[s.bar, { height: barHeight }, isActive ? s.barActive : null]}
            />
            <Text accessible={false} style={[s.label, isActive ? s.labelActive : null]}>
              {labels[i] ?? ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const bars: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-end',
  gap: 8,
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: T.radius,
  padding: 16,
};
const col: ViewStyle = { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 };
const bar: ViewStyle = { width: '100%', backgroundColor: T.barTrack, borderRadius: 8 };
const barActive: ViewStyle = { backgroundColor: T.accent };
const labelStyle: TextStyle = { fontSize: 10, color: T.muted };
const labelActive: TextStyle = { color: T.accent, fontWeight: '700' };

const s = StyleSheet.create({ bars, col, bar, barActive, label: labelStyle, labelActive });
