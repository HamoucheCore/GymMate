import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Full-width is the default; pass false for a compact inline button. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** The one confident action on a screen. Accent fill, 52pt target. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        fullWidth ? s.full : s.inline,
        pressed && !disabled ? s.pressed : null,
        disabled ? s.disabled : null,
        style,
      ]}>
      <Text style={s.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const base: ViewStyle = {
  backgroundColor: T.accent,
  borderRadius: 16,
  minHeight: 52,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
};
const full: ViewStyle = { alignSelf: 'stretch' };
const inline: ViewStyle = { alignSelf: 'flex-start' };
const pressed: ViewStyle = { opacity: 0.82 };
const disabled: ViewStyle = { backgroundColor: T.surface2, opacity: 0.6 };
const label: TextStyle = { fontSize: 15, fontWeight: '700', color: T.accentInk };

const s = StyleSheet.create({ base, full, inline, pressed, disabled, label });
