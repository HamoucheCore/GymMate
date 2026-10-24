/**
 * Calorie ring — one circular gauge for the day's energy intake.
 *
 * The arc is deliberately clamped to a single lap (`calorieProgress` returns
 * 0..1): going over target keeps the ring full and lets the caption say how far
 * over, rather than wrapping a second time and losing the "you are done" cue.
 * A missing target therefore draws an empty ring — never a fabricated one.
 */
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatKcal } from '@/lib/gymmate/format';
import { calorieProgress } from '@/lib/gymmate/nutrition';
import type { Goal } from '@/lib/gymmate/store';

export interface MacroRingProps {
  value: number;
  target: number | null;
  goal: Goal;
  /** Outer diameter in pt. Default 168. */
  size?: number;
  label?: string;
  unit?: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_SIZE = 168;
/** Below this the ring stops reading as a ring, so the default is safer. */
const MIN_SIZE = 64;

export function MacroRing({
  value,
  target,
  goal,
  size = DEFAULT_SIZE,
  label = 'Calories',
  unit = 'kcal',
  caption,
  style,
}: MacroRingProps) {
  const diameter = Number.isFinite(size) && size >= MIN_SIZE ? Math.round(size) : DEFAULT_SIZE;
  const strokeWidth = Math.max(8, Math.round(diameter * 0.075));
  const radius = (diameter - strokeWidth) / 2;
  const center = diameter / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = calorieProgress(value, target);
  const percent = Math.round(progress * 100);
  const hasTarget = target !== null && Number.isFinite(target) && target > 0;
  const targetLabel = hasTarget && target !== null ? ` of ${formatKcal(target)}` : '';
  const fillColor = goal === 'gain' ? T.goalGain : T.goalLose;

  const valueSize = Math.max(13, Math.round(diameter * 0.125));
  const targetSize = Math.max(10, Math.round(diameter * 0.068));
  const innerWidth = Math.max(40, diameter - strokeWidth * 2 - 6);

  const ringStyle: ViewStyle = { width: diameter, height: diameter };
  const valueStyle: TextStyle = { ...valueText, fontSize: valueSize, maxWidth: innerWidth };
  const targetStyle: TextStyle = { ...targetText, fontSize: targetSize, maxWidth: innerWidth };

  return (
    <View style={[s.wrap, style]}>
      <View
        accessible
        accessibilityRole={hasTarget ? 'progressbar' : 'text'}
        accessibilityLabel={`${label}: ${formatKcal(value)}${targetLabel}`}
        accessibilityValue={hasTarget ? { min: 0, max: 100, now: percent } : undefined}
        accessibilityHint={hasTarget ? undefined : `Add your profile to see a daily ${unit} target`}
        style={[s.ring, ringStyle]}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Svg width={diameter} height={diameter}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={T.barTrack}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* A round cap on a zero-length dash leaves a stray dot at 12
                o'clock, so the cap only rounds once there is an arc. */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={fillColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap={progress > 0 ? 'round' : 'butt'}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>
        </View>

        <View
          style={s.center}
          accessible={false}
          importantForAccessibility="no-hide-descendants">
          <Text
            accessible={false}
            style={valueStyle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {formatKcal(Math.round(value))}
          </Text>
          <Text accessible={false} style={targetStyle} numberOfLines={1}>
            {hasTarget && target !== null ? `of ${formatKcal(target)}` : 'No target yet'}
          </Text>
        </View>
      </View>

      {caption ? (
        <Text style={s.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const wrap: ViewStyle = { alignItems: 'center' };
const ring: ViewStyle = { alignItems: 'center', justifyContent: 'center' };
const center: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};
const valueText: TextStyle = { fontFamily: T.fontMonoBold, color: T.ink, textAlign: 'center' };
const targetText: TextStyle = { fontFamily: T.fontMono, color: T.muted, textAlign: 'center' };
const caption: TextStyle = {
  marginTop: 10,
  fontSize: 12,
  fontFamily: T.fontMono,
  color: T.muted,
  textAlign: 'center',
};

const s = StyleSheet.create({ wrap, ring, center, caption });
