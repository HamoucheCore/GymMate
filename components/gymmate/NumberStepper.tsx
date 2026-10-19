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

export interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unit suffix shown next to the value, e.g. 'kg' or 'min'. */
  unit?: string;
  /** Decimal places for display. Defaults to 0 for whole-number steps, else 1. */
  precision?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Accessible −/+ numeric field. Screen-reader friendly, 44pt targets,
 * clamps to [min, max] and immune to floating-point dust.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  precision,
  style,
}: NumberStepperProps) {
  const decimals = precision ?? (Number.isInteger(step) ? 0 : 1);
  const canDecrease = value - step >= min - 1e-9;
  const canIncrease = value + step <= max + 1e-9;

  function commit(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    onChange(Number(clamped.toFixed(decimals)));
  }

  const display = `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;

  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={() => commit(value - step)}
          style={({ pressed }) => [
            s.btn,
            pressed && canDecrease ? s.btnPressed : null,
            !canDecrease ? s.btnDisabled : null,
          ]}>
          <Icons.decrement color={T.accent} size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
        </Pressable>

        <View style={s.valueBox} accessible accessibilityRole="text" accessibilityLabel={`${label}: ${display}`}>
          <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {display}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={() => commit(value + step)}
          style={({ pressed }) => [
            s.btn,
            pressed && canIncrease ? s.btnPressed : null,
            !canIncrease ? s.btnDisabled : null,
          ]}>
          <Icons.increment color={T.accent} size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
        </Pressable>
      </View>
    </View>
  );
}

const wrap: ViewStyle = { gap: 6 };
const labelStyle: TextStyle = { fontSize: 12, color: T.muted, letterSpacing: 0.3 };
const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 10 };
const btn: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
};
const btnPressed: ViewStyle = { backgroundColor: T.pillBg };
const btnDisabled: ViewStyle = { opacity: 0.4 };
const valueBox: ViewStyle = { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 };
const valueStyle: TextStyle = { fontSize: 18, fontFamily: T.fontMonoBold, color: T.ink };

const s = StyleSheet.create({
  wrap,
  label: labelStyle,
  row,
  btn,
  btnPressed,
  btnDisabled,
  valueBox,
  value: valueStyle,
});
