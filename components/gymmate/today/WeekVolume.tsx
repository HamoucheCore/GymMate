/**
 * Today-only: the weekly volume chart.
 *
 * Thin composition around the shared `VolumeBars` that adds the one line of
 * context the bars cannot carry themselves. Every number comes from the
 * caller's real log aggregation.
 */
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { VolumeBars } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface WeekVolumeProps {
  /** One entry per weekday, 0..100 (percent of the week's biggest day). */
  values: number[];
  labels: string[];
  /** Real current weekday, Monday = 0. */
  highlightIndex: number;
  /** One real sentence, e.g. 'Today 4 sets · peak Wed with 9 sets'. */
  summary: string;
  style?: StyleProp<ViewStyle>;
}

export function WeekVolume({ values, labels, highlightIndex, summary, style }: WeekVolumeProps) {
  return (
    <View style={style}>
      <VolumeBars
        values={values}
        labels={labels}
        highlightIndex={highlightIndex}
        summary={summary}
      />
      {/* The bars already announce this; the visible copy is decorative. */}
      <Text style={s.summary} accessible={false}>
        {summary}
      </Text>
    </View>
  );
}

const summary: TextStyle = {
  fontSize: 12,
  color: T.muted,
  marginTop: 8,
  paddingHorizontal: 2,
  fontFamily: T.fontMono,
};

const s = StyleSheet.create({ summary });
