import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { PrimaryButton } from '@/components/gymmate/PrimaryButton';

export interface EmptyStateProps {
  title: string;
  body?: string;
  /** Optional CTA. Rendered only when both label and handler are provided. */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Icon-free empty placeholder: title, explanatory body, optional CTA.
 * Deliberately calm — it should read as an invitation, not a failure.
 */
export function EmptyState({ title, body, actionLabel, onAction, style }: EmptyStateProps) {
  const showAction = Boolean(actionLabel && onAction);
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
      {showAction && actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} fullWidth={false} style={s.action} />
      ) : null}
    </View>
  );
}

const wrap: ViewStyle = {
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 26,
  paddingVertical: 28,
  paddingHorizontal: 20,
  alignItems: 'center',
  gap: 8,
};
const title: TextStyle = { fontSize: 15, fontWeight: '700', color: T.ink, textAlign: 'center' };
const body: TextStyle = { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 19 };
const action: ViewStyle = { marginTop: 8, paddingHorizontal: 22 };

const s = StyleSheet.create({ wrap, title, body, action });
