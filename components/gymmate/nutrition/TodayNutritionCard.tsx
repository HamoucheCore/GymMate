/**
 * Today-tab nutrition summary — a compact capped version of the tracker.
 *
 * The ring has a fixed 112pt footprint and the text column takes the remaining
 * width with `minWidth: 0`, so on a 320pt phone the macro line wraps instead of
 * pushing the card wider. Zeros are real logged zeros; without a target the
 * ring simply reports "No target yet".
 */
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Card } from '@/components/gymmate/Card';
import { GhostButton } from '@/components/gymmate/GhostButton';
import { MacroRing } from '@/components/gymmate/nutrition/MacroRing';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatGrams, formatKcal } from '@/lib/gymmate/format';
import {
  remainingCalories,
  type NutritionTarget,
  type NutritionTotals,
} from '@/lib/gymmate/nutrition';
import type { Goal } from '@/lib/gymmate/store';

export interface TodayNutritionCardProps {
  totals: NutritionTotals;
  target: NutritionTarget | null;
  goal: Goal;
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TodayNutritionCard({
  totals,
  target,
  goal,
  onOpen,
  style,
}: TodayNutritionCardProps) {
  const macros = `P ${formatGrams(totals.protein)} · C ${formatGrams(totals.carbs)} · F ${formatGrams(totals.fat)}`;
  // The ring already states today's intake, so the column spends its one big
  // line on what is left (or over) instead of repeating the same figure.
  const remaining = remainingCalories(totals, target);
  const headline = remaining === null
    ? 'No target yet'
    : remaining >= 0
      ? `${formatKcal(remaining)} left`
      : `${formatKcal(Math.abs(remaining))} over`;

  return (
    <Card style={style}>
      <View style={s.row}>
        <MacroRing
          value={totals.calories}
          target={target ? target.calories : null}
          goal={goal}
          size={112}
        />

        <View style={s.body}>
          <Text style={s.kicker} numberOfLines={1}>
            Today&apos;s fuel
          </Text>
          <Text style={s.calories} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={s.macros} numberOfLines={2}>
            {macros}
          </Text>
          <GhostButton
            label="Open tracker"
            fullWidth={false}
            onPress={onOpen}
            accessibilityHint="Opens the calorie and macro tracker"
            style={s.action}
          />
        </View>
      </View>
    </Card>
  );
}

const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 14 };
const body: ViewStyle = { flex: 1, minWidth: 0, gap: 4 };
const kicker: TextStyle = { fontSize: 12, color: T.muted };
const calories: TextStyle = { fontSize: 17, fontFamily: T.fontMonoBold, color: T.ink };
const macros: TextStyle = {
  fontSize: 11,
  fontFamily: T.fontMono,
  color: T.muted,
  lineHeight: 16,
};
const action: ViewStyle = { marginTop: 6 };

const s = StyleSheet.create({ row, body, kicker, calories, macros, action });
