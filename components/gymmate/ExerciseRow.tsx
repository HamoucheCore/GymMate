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
import { Icons, ICON_SIZE, ICON_STROKE } from './icons';
import { ExerciseVisual } from './exercise/ExerciseVisual';
import type { LibraryExercise } from '@/lib/gymmate/data';

export interface ExerciseRowProps {
  /** Leading plate label — typically the load, e.g. '80 kg' or 'BW'. */
  load?: string;
  name: string;
  detail: string;
  done?: boolean;
  onToggle?: () => void;
  /** Catalog entry for this lift: swaps the text plate for a figure thumbnail. */
  exercise?: LibraryExercise;
  /** Press on the row itself, e.g. to open the exercise details. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const THUMB_SIZE = 48;

/**
 * Single planned exercise with an optional checkbox.
 *
 * Used by Today (load, name, detail, a check-off) and by any list that knows
 * the catalog entry (pass `exercise` for the figure thumbnail and `load` too
 * to keep the load visible as a badge on it). Every part except `name` and
 * `detail` is optional, so a read-only row and a checkable row are the same
 * component.
 */
export function ExerciseRow({
  load,
  name,
  detail,
  done = false,
  onToggle,
  exercise,
  onPress,
  style,
}: ExerciseRowProps) {
  const check = onToggle ? (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={name}
      accessibilityHint={done ? 'Tap to unmark' : 'Tap to mark as done'}
      onPress={onToggle}
      style={({ pressed }) => [s.check, done ? s.checkDone : null, pressed ? s.checkPressed : null]}>
      <Icons.check
        color={done ? T.accentInk : T.muted}
        size={ICON_SIZE.md}
        strokeWidth={ICON_STROKE}
      />
    </Pressable>
  ) : null;

  // The visual + text, kept separate from `check` so the checkbox is a sibling
  // of the row's "open details" button and never nests inside it.
  const rowBody = (
    <>
      {exercise ? (
        <View style={[s.thumbWrap, done ? s.thumbWrapDone : null]}>
          <ExerciseVisual exercise={exercise} size={THUMB_SIZE} rounded={14} decorative />
          {load === undefined ? null : (
            <View style={s.loadBadge}>
              <Text
                style={s.loadBadgeText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}>
                {load}
              </Text>
            </View>
          )}
        </View>
      ) : load === undefined ? null : (
        <View style={s.plate}>
          <Text style={s.plateText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {load}
          </Text>
        </View>
      )}

      <View style={s.body}>
        <Text style={[s.name, done ? s.nameDone : null]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={s.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </>
  );

  // One row holding at most two sibling controls: the optional "open details"
  // button and the optional checkbox. They never nest, so each keeps its own
  // accessibility node and its own 44pt+ target.
  return (
    <View style={[s.row, style]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${detail}`}
          accessibilityHint="Opens the exercise details"
          onPress={onPress}
          style={({ pressed }) => [s.bodyButton, pressed ? s.rowPressed : null]}>
          {rowBody}
        </Pressable>
      ) : (
        <View style={s.bodyButton}>{rowBody}</View>
      )}
      {check}
    </View>
  );
}

const row: ViewStyle = {
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: T.radius,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
};
const rowPressed: ViewStyle = { backgroundColor: T.surface2 };
// The inner region that owns the row's "open details" button. It fills the
// space to the left of the optional checkbox so the two controls are siblings
// rather than nested.
const bodyButton: ViewStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderRadius: T.radius,
};
const plate: ViewStyle = {
  width: 52,
  height: 48,
  borderRadius: 16,
  backgroundColor: T.plateBg,
  borderColor: T.line,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
};
const plateText: TextStyle = { fontSize: 12, fontFamily: T.fontMonoBold, color: T.accent };
const thumbWrap: ViewStyle = { width: THUMB_SIZE, height: THUMB_SIZE };
// Dim the whole thumbnail slot when done, so the load badge fades with the
// image instead of staying at full opacity over a faded one.
const thumbWrapDone: ViewStyle = { opacity: 0.55 };
const loadBadge: ViewStyle = {
  position: 'absolute',
  // Inset from the corner so the badge sits inside the thumbnail's 14px
  // rounded edge instead of overhanging it.
  right: 2,
  bottom: 2,
  minWidth: 24,
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 8,
  backgroundColor: T.plateBg,
  borderColor: T.line,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
};
const loadBadgeText: TextStyle = { fontSize: 10, fontFamily: T.fontMonoBold, color: T.accent };
const body: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const nameStyle: TextStyle = { fontSize: 14, fontWeight: '700', color: T.ink };
const nameDone: TextStyle = { color: T.muted, textDecorationLine: 'line-through' };
const detail: TextStyle = { fontSize: 12, fontFamily: T.fontMono, color: T.muted };
const check: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  borderWidth: 1.5,
  borderColor: T.checkBorder,
  alignItems: 'center',
  justifyContent: 'center',
};
const checkDone: ViewStyle = { backgroundColor: T.accent, borderColor: T.accent };
const checkPressed: ViewStyle = { opacity: 0.75 };

const s = StyleSheet.create({
  row,
  rowPressed,
  bodyButton,
  plate,
  plateText,
  thumbWrap,
  thumbWrapDone,
  loadBadge,
  loadBadgeText,
  body,
  name: nameStyle,
  nameDone,
  detail,
  check,
  checkDone,
  checkPressed,
});
