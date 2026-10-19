import { type ReactNode, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface StepTransitionProps {
  /** 1 slides in from the right (forward), -1 from the left (back). */
  direction: 1 | -1;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mount-time fade + slide for a single step. Remount it by changing its `key`
 * to the step id; the enter animation runs once and never loops. Honors the
 * OS "reduce motion" setting by settling instantly.
 */
export function StepTransition({ direction, children, style }: StepTransitionProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) });
  }, [direction, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: (1 - progress.value) * direction * 26 },
      { translateY: (1 - progress.value) * 10 },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
