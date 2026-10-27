import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export type PillTone = 'default' | 'accent' | 'muted';

export interface PillProps {
  label: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
}

/** Non-interactive label chip (focus names, tags, counts). */
export function Pill({ label, tone = 'default', style }: PillProps) {
  return (
    <View style={[s.pill, toneStyles[tone], style]}>
      <Text style={[s.text, toneTextStyles[tone]]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const pill: ViewStyle = {
  backgroundColor: T.pillBg,
  borderRadius: 999,
  paddingVertical: 6,
  paddingHorizontal: 12,
  alignSelf: 'flex-start',
  maxWidth: '100%',
};
const toneAccent: ViewStyle = { backgroundColor: T.accent };
const toneMuted: ViewStyle = { backgroundColor: T.surface2 };
const textStyle: TextStyle = { fontSize: 12, fontWeight: '600', color: T.pillText };
const textAccent: TextStyle = { color: T.accentInk, fontWeight: '700' };
const textMuted: TextStyle = { color: T.muted };

const s = StyleSheet.create({
  pill,
  toneAccent,
  toneMuted,
  text: textStyle,
  textAccent,
  textMuted,
});

const toneStyles: Record<PillTone, StyleProp<ViewStyle>> = {
  default: undefined,
  accent: s.toneAccent,
  muted: s.toneMuted,
};

const toneTextStyles: Record<PillTone, StyleProp<TextStyle>> = {
  default: undefined,
  accent: s.textAccent,
  muted: s.textMuted,
};
