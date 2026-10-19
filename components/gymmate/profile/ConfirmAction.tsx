import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { GhostButton } from '@/components/gymmate/GhostButton';

export interface ConfirmActionProps {
  /** Idle button label. */
  label: string;
  /** Heading for the confirm step, e.g. "Reset everything?". */
  title: string;
  /** What the action destroys, in plain words. */
  message: string;
  /** Label of the final, irreversible button. */
  confirmLabel: string;
  /** Label of the escape hatch. */
  cancelLabel?: string;
  onConfirm: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-step confirm for an irreversible action.
 *
 * Deliberately in-screen rather than `Alert.alert`: alerts are inert on
 * react-native-web, and the warning needs to stay legible while the user
 * decides instead of living in a system dialog.
 */
export function ConfirmAction({
  label,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  style,
}: ConfirmActionProps) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <View style={style}>
        <GhostButton
          label={label}
          tone="danger"
          onPress={() => setArmed(true)}
          accessibilityHint="Asks you to confirm before anything is deleted"
        />
      </View>
    );
  }

  return (
    <View style={[s.panel, style]}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.message} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {message}
      </Text>

      <View style={s.actions}>
        <GhostButton
          label={cancelLabel}
          onPress={() => setArmed(false)}
          fullWidth={false}
          style={s.cancel}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          onPress={onConfirm}
          style={({ pressed }) => [s.confirm, pressed ? s.confirmPressed : null]}>
          <Text style={s.confirmText} numberOfLines={1}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const panel: ViewStyle = {
  backgroundColor: T.surface2,
  borderColor: T.danger,
  borderWidth: 1,
  borderRadius: 20,
  padding: 16,
  gap: 8,
};
const title: TextStyle = { fontSize: 15, fontWeight: '800', color: T.danger };
const message: TextStyle = { fontSize: 13, color: T.label, lineHeight: 19 };
const actions: ViewStyle = { flexDirection: 'row', gap: 10, marginTop: 6 };
const cancel: ViewStyle = { flex: 1 };
const confirm: ViewStyle = {
  flex: 1,
  minHeight: 48,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: T.danger,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
};
const confirmPressed: ViewStyle = { opacity: 0.75 };
const confirmText: TextStyle = { fontSize: 14, fontWeight: '800', color: T.danger };

const s = StyleSheet.create({ panel, title, message, actions, cancel, confirm, confirmPressed, confirmText });
