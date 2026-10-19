import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface RecapRowProps {
  label: string;
  value: string;
  /** Optional value tint — used for the goal-tinted rows in the summary. */
  color?: string;
  /** Suppress the hairline under the final row. */
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One label/value pair in the summary recap. */
export function RecapRow({ label, value, color, last = false, style }: RecapRowProps) {
  return (
    <View style={[s.row, last ? null : s.divider, style]}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const row: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  paddingVertical: 13,
};
const divider: ViewStyle = { borderBottomColor: T.line, borderBottomWidth: 1 };
const label: TextStyle = { fontSize: 14, color: T.muted };
const value: TextStyle = { fontSize: 16, fontFamily: T.fontMonoBold, color: T.ink };

const s = StyleSheet.create({ row, divider, label, value });
