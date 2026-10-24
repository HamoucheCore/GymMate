/**
 * The day's energy at a glance: goal-tinted calorie ring plus the three macro
 * bars underneath.
 *
 * No Card wrapper and no store access on purpose — the screen decides the
 * surface, so this block can drop into a sheet or a wide column unchanged.
 * The caption is derived from `remainingCalories`, which distinguishes "no
 * target" (null) from a real "0 left today".
 */
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { MacroBar } from '@/components/gymmate/nutrition/MacroBar';
import { MacroRing } from '@/components/gymmate/nutrition/MacroRing';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatKcal } from '@/lib/gymmate/format';
import {
  remainingCalories,
  type NutritionTarget,
  type NutritionTotals,
} from '@/lib/gymmate/nutrition';
import type { Goal } from '@/lib/gymmate/store';

export interface NutritionOverviewProps {
  totals: NutritionTotals;
  target: NutritionTarget | null;
  goal: Goal;
  style?: StyleProp<ViewStyle>;
}

export function NutritionOverview({ totals, target, goal, style }: NutritionOverviewProps) {
  const remaining = remainingCalories(totals, target);

  let caption: string;
  if (remaining === null) {
    // A profile can exist while `nutritionTargetFor` refuses to estimate (an
    // unusable stored start weight), so this must not imply "no profile".
    caption = 'Intake only — no target yet';
  } else if (remaining >= 0) {
    caption = `${formatKcal(remaining)} left today`;
  } else {
    caption = `${formatKcal(Math.abs(remaining))} over target`;
  }

  const helper = target
    ? `Targets follow your ${goal === 'gain' ? 'surplus' : 'deficit'} goal and latest weigh-in.`
    : 'Add a profile with a starting weight to get targets.';

  return (
    <View style={[s.wrap, style]}>
      <MacroRing
        value={totals.calories}
        target={target ? target.calories : null}
        goal={goal}
        caption={caption}
      />

      <View style={s.bars}>
        <MacroBar
          label="Protein"
          icon="protein"
          value={totals.protein}
          target={target ? target.protein : null}
        />
        <MacroBar
          label="Carbs"
          icon="carbs"
          value={totals.carbs}
          target={target ? target.carbs : null}
        />
        <MacroBar
          label="Fat"
          icon="fat"
          value={totals.fat}
          target={target ? target.fat : null}
        />
      </View>

      <Text style={s.helper} numberOfLines={2}>
        {helper}
      </Text>
    </View>
  );
}

const wrap: ViewStyle = { gap: 18 };
const bars: ViewStyle = { gap: 2 };
const helper: TextStyle = {
  fontSize: 11,
  fontFamily: T.fontMono,
  color: T.muted,
  textAlign: 'center',
  lineHeight: 16,
};

const s = StyleSheet.create({ wrap, bars, helper });
