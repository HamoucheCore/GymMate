import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export type StatTone = 'default' | 'accent' | 'danger' | 'success' | 'muted';

export interface StatTileProps {
  label: string;
  /** Pre-formatted value — use '@/lib/gymmate/format' helpers for consistency. */
  value: string;
  hint?: string;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
}

/** Compact metric block: label on top, big value, optional hint. */
export function StatTile({ label, value, hint, tone = 'default', style }: StatTileProps) {
  return (
    <View
      style={[s.tile, style]}
      accessible
      accessibilityLabel={hint ? `${label}: ${value}, ${hint}` : `${label}: ${value}`}>
      <Text style={s.label} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[s.value, toneValue[tone]]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
      {hint ? (
        <Text style={s.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const tile: ViewStyle = {
  flex: 1,
  minWidth: 0,
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: T.radius,
  padding: 14,
  gap: 4,
};
const labelStyle: TextStyle = { fontSize: 11, color: T.muted, letterSpacing: 0.4 };
const valueStyle: TextStyle = { fontSize: 22, fontFamily: T.fontMonoBold, color: T.ink };
const valueAccent: TextStyle = { color: T.accent };
const valueDanger: TextStyle = { color: T.danger };
const valueSuccess: TextStyle = { color: T.success };
const valueMuted: TextStyle = { color: T.muted };
const hint: TextStyle = { fontSize: 11, fontFamily: T.fontMono, color: T.muted };

const s = StyleSheet.create({
  tile,
  label: labelStyle,
  value: valueStyle,
  valueAccent,
  valueDanger,
  valueSuccess,
  valueMuted,
  hint,
});

const toneValue: Record<StatTone, StyleProp<TextStyle>> = {
  default: undefined,
  accent: s.valueAccent,
  danger: s.valueDanger,
  success: s.valueSuccess,
  muted: s.valueMuted,
};
