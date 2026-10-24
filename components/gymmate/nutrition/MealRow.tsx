/**
 * One logged meal in a day's list — a thin domain wrapper around `EntryRow`.
 *
 * The row styling, delete affordance and 44pt target stay in the shared
 * `EntryRow`; this file only decides what a meal's headline, context line and
 * metric say, so the nutrition list can never drift from the other logs.
 */
import type { StyleProp, ViewStyle } from 'react-native';
import { EntryRow } from '@/components/gymmate/profile/EntryRow';
import { formatDateLabel, formatGrams, formatKcal } from '@/lib/gymmate/format';
import { mealSlotLabel } from '@/lib/gymmate/nutrition';
import type { MealLog } from '@/lib/gymmate/store';

export interface MealRowProps {
  meal: MealLog;
  onDelete: () => void;
  style?: StyleProp<ViewStyle>;
}

export function MealRow({ meal, onDelete, style }: MealRowProps) {
  const subtitle = `${mealSlotLabel(meal.slot)} · P ${formatGrams(meal.protein)} · C ${formatGrams(meal.carbs)} · F ${formatGrams(meal.fat)}`;

  return (
    <EntryRow
      title={meal.name}
      subtitle={subtitle}
      value={formatKcal(meal.calories)}
      deleteLabel={`Delete ${meal.name} from ${formatDateLabel(meal.date)}`}
      onDelete={onDelete}
      style={style}
    />
  );
}
