import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ICON_SIZE, ICON_STROKE, Icons } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

const AnimatedLoseIcon = Animated.createAnimatedComponent(Icons.goalLose);
const AnimatedGainIcon = Animated.createAnimatedComponent(Icons.goalGain);

/** Kept local so the primitive stays independent of the store. */
export type GoalKind = 'lose' | 'gain';

export interface GoalCardProps {
  goal: GoalKind;
  title: string;
  caption: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * A large, tappable goal choice. Selection is confirmed three ways at once —
 * a tinted border, a low-alpha wash, and a filled badge — while a spring on
 * press gives the tap a physical feel. Tint comes from the goal the card
 * represents, so the two choices stay distinguishable in the purple family.
 */
export function GoalCard({ goal, title, caption, selected, onPress }: GoalCardProps) {
  const tint = goal === 'lose' ? T.goalLose : T.goalGain;
  const BadgeIcon = goal === 'lose' ? AnimatedLoseIcon : AnimatedGainIcon;

  const selection = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduced motion still applies the selection state, just without the tween.
    selection.value = reduced ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected, selection, reduced]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selection.value, [0, 1], [T.line, tint]),
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));
  const washStyle = useAnimatedStyle(() => ({ opacity: selection.value * 0.14 }));
  const badgeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], [T.surface2, tint]),
  }));
  const glyphStyle = useAnimatedProps(() => ({
    color: interpolateColor(selection.value, [0, 1], [T.pillText, T.accentInk]),
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${caption}`}
      onPress={onPress}
      onPressIn={() => {
        press.value = reduced ? 1 : withSpring(1, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        press.value = reduced ? 0 : withSpring(0, { damping: 18, stiffness: 260 });
      }}>
      <Animated.View style={[s.card, cardStyle]}>
        <Animated.View pointerEvents="none" style={[s.wash, { backgroundColor: tint }, washStyle]} />
        <Animated.View style={[s.badge, badgeStyle]}>
          <BadgeIcon size={ICON_SIZE.md} strokeWidth={ICON_STROKE} animatedProps={glyphStyle} />
        </Animated.View>
        <View style={s.text}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.caption} numberOfLines={2}>
            {caption}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const card: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
  minHeight: 78,
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface,
  overflow: 'hidden',
};
const wash: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
const badge: ViewStyle = {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: 'center',
  justifyContent: 'center',
};
const text: ViewStyle = { flex: 1, gap: 3 };
const title: TextStyle = { fontSize: 17, fontWeight: '800', color: T.ink, letterSpacing: -0.2 };
const caption: TextStyle = { fontSize: 13, color: T.muted, lineHeight: 18 };

const s = StyleSheet.create({ card, wash, badge, text, title, caption });
