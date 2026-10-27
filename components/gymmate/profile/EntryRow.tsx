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

export interface EntryRowProps {
  title: string;
  subtitle: string;
  /** Optional right-aligned metric (duration, delta, …). */
  value?: string;
  /** Descriptive label for the destructive action, e.g. "Delete 5.2 km run on Sat 18 Oct". */
  deleteLabel: string;
  onDelete: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One logged entry: headline, context line, optional metric, delete action.
 * The delete button carries its own descriptive accessibility label because
 * "Delete" alone is meaningless when read out of context.
 */
export function EntryRow({ title, subtitle, value, deleteLabel, onDelete, style }: EntryRowProps) {
  return (
    <View style={[s.row, style]}>
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {value ? (
        <Text style={s.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [s.deleteBtn, pressed ? s.deleteBtnPressed : null]}>
        <Text style={s.deleteBtnText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const row: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: 8,
  minHeight: 60,
};
const body: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const title: TextStyle = { fontSize: 15, fontFamily: T.fontMonoMedium, color: T.ink };
const subtitle: TextStyle = { fontSize: 12, color: T.muted, fontFamily: T.fontMono };
const value: TextStyle = { fontSize: 15, fontFamily: T.fontMonoBold, color: T.ink };
const deleteBtn: ViewStyle = {
  minHeight: 44,
  minWidth: 44,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderColor: T.line,
  borderWidth: 1,
  backgroundColor: T.surface2,
  alignItems: 'center',
  justifyContent: 'center',
};
const deleteBtnPressed: ViewStyle = { opacity: 0.7 };
const deleteBtnText: TextStyle = { fontSize: 12, fontWeight: '600', color: T.danger };

const s = StyleSheet.create({
  row,
  body,
  title,
  subtitle,
  value,
  deleteBtn,
  deleteBtnPressed,
  deleteBtnText,
});
