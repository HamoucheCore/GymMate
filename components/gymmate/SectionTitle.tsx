import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot, typically a small action. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Small heading above a group of cards, with an optional trailing action. */
export function SectionTitle({ title, subtitle, action, style }: SectionTitleProps) {
  return (
    <View style={[s.row, style]}>
      <View style={s.text}>
        <Text style={s.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const row: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 10,
  minHeight: 24,
};
const text: ViewStyle = { flex: 1 };
const title: TextStyle = { fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: 0.2 };
const subtitle: TextStyle = { fontSize: 12, color: T.muted, marginTop: 2 };

const s = StyleSheet.create({ row, text, title, subtitle });
