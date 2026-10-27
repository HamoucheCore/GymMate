import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-side slot (avatar, pill, small action). */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen title block that respects the top safe-area inset.
 * Use at the top of every scrollable screen.
 */
export function ScreenHeader({ title, subtitle, trailing, style }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingTop: insets.top + 12 }, style]}>
      <View style={s.text}>
        <Text style={s.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const wrap: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
  paddingBottom: 16,
};
const text: ViewStyle = { flex: 1, gap: 2 };
const title: TextStyle = { fontSize: 28, fontWeight: '800', color: T.ink, letterSpacing: -0.4 };
const subtitle: TextStyle = { fontSize: 13, color: T.muted };

const s = StyleSheet.create({ wrap, text, title, subtitle });
