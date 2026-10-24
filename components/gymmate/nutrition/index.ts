/**
 * Nutrition surface components — the calorie/macro tracker's presentational
 * layer, shared by the Nutrition screen and the Today tab.
 *
 * Route-agnostic like the rest of `components/gymmate`: props in, callbacks
 * out, no `useGym` and no `Date` (the one exception is the default meal slot
 * the sheet picks when it opens). All maths comes from `lib/gymmate/nutrition`
 * and all display strings from `lib/gymmate/format`.
 */
export { MacroRing, type MacroRingProps } from './MacroRing';
export { MacroBar, type MacroBarProps } from './MacroBar';
export { NutritionOverview, type NutritionOverviewProps } from './NutritionOverview';
export { TodayNutritionCard, type TodayNutritionCardProps } from './TodayNutritionCard';
export { MealRow, type MealRowProps } from './MealRow';
export { AddMealSheet, type AddMealSheetProps, type MealDraft } from './AddMealSheet';
