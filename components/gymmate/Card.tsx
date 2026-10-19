import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface CardProps {
  children: ReactNode;
  /** Set false to control padding yourself (e.g. list rows flush to edges). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rounded surface container. The default wrapper for every block of content. */
export function Card({ children, padded = true, style }: CardProps) {
  return <View style={[s.card, padded && s.padded, style]}>{children}</View>;
}

const card: ViewStyle = {
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 26,
};
const padded: ViewStyle = { padding: 18 };

const s = StyleSheet.create({ card, padded });
