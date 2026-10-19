import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface OnboardingProgressProps {
  /** Total number of steps in the active sequence. */
  count: number;
  /** Zero-based index of the current step. */
  activeIndex: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Segmented step indicator. Each segment fills with the accent as the flow
 * advances — the sequence is real, so a numbered/segmented device earns its
 * place instead of decorating.
 */
export function OnboardingProgress({ count, activeIndex, style }: OnboardingProgressProps) {
  const safeIndex = Math.max(0, Math.min(activeIndex, count - 1));
  return (
    <View
      style={[s.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${safeIndex + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <Segment key={i} filled={i <= activeIndex} />
      ))}
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduced motion still settles the segment, just without the tween.
    progress.value = reduced ? (filled ? 1 : 0) : withTiming(filled ? 1 : 0, { duration: 320 });
  }, [filled, progress, reduced]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, fillStyle]} />
    </View>
  );
}

const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 };
const track: ViewStyle = {
  flex: 1,
  height: 4,
  borderRadius: 999,
  backgroundColor: T.line,
  overflow: 'hidden',
};
const fill: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: T.accent,
  borderRadius: 999,
};

const s = StyleSheet.create({ row, track, fill });
