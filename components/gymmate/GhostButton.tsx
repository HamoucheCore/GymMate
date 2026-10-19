import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export type GhostTone = 'default' | 'danger';

export interface GhostButtonProps {
  label: string;
  onPress: () => void;
  tone?: GhostTone;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Secondary / destructive action. Outlined, never competes with PrimaryButton. */
export function GhostButton({
  label,
  onPress,
  tone = 'default',
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: GhostButtonProps) {
  const danger = tone === 'danger';
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
        danger ? s.borderDanger : s.border,
        pressed && !disabled ? s.pressed : null,
        disabled ? s.disabled : null,
        style,
      ]}>
      <Text style={[s.label, danger ? s.labelDanger : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const base: ViewStyle = {
  backgroundColor: T.surface2,
  borderWidth: 1,
  borderRadius: 16,
  minHeight: 48,
  paddingHorizontal: 18,
  alignItems: 'center',
  justifyContent: 'center',
};
const border: ViewStyle = { borderColor: T.line };
const borderDanger: ViewStyle = { borderColor: T.danger };
const full: ViewStyle = { alignSelf: 'stretch' };
const inline: ViewStyle = { alignSelf: 'flex-start' };
const pressed: ViewStyle = { opacity: 0.75 };
const disabled: ViewStyle = { opacity: 0.45 };
const label: TextStyle = { fontSize: 14, fontWeight: '700', color: T.label };
const labelDanger: TextStyle = { color: T.danger };

const s = StyleSheet.create({
  base,
  border,
  borderDanger,
  full,
  inline,
  pressed,
  disabled,
  label,
  labelDanger,
});
