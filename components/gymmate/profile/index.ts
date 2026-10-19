/**
 * Profile / logged-history surface components.
 *
 * Route-agnostic presentational pieces shared by the Cardio, Progress and You
 * tabs: goal progress, the bodyweight trend sparkline, a deletable entry row
 * and a two-step destructive confirm.
 *
 * Rules match `components/gymmate`: theme tokens only, no store access from
 * inside the components, strictly typed props, 44pt+ touch targets.
 */
export { GoalProgress, type GoalProgressProps } from './GoalProgress';
export { WeightTrend, type WeightTrendProps } from './WeightTrend';
export { EntryRow, type EntryRowProps } from './EntryRow';
export { ConfirmAction, type ConfirmActionProps } from './ConfirmAction';
export { goalLabel, memberSinceLabel } from './labels';
