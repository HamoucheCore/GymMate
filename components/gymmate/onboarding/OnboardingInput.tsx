import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface OnboardingInputProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A single, generously sized field. Border turns accent while focused. */
export function OnboardingInput({
  label,
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  maxLength = 32,
  returnKeyType = 'next',
  onSubmitEditing,
  style,
}: OnboardingInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        autoFocus={autoFocus}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        selectionColor={T.accent}
        style={[s.input, focused ? s.inputFocused : null]}
      />
    </View>
  );
}

const wrap: ViewStyle = { gap: 8 };
const label: TextStyle = { fontSize: 12, color: T.muted, letterSpacing: 0.3 };
const input: TextStyle = {
  minHeight: 56,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
  paddingHorizontal: 16,
  color: T.ink,
  fontSize: 20,
  fontWeight: '700',
};
const inputFocused: TextStyle = { borderColor: T.accent };

const s = StyleSheet.create({ wrap, label, input, inputFocused });
