/**
 * GymMate shared design system — route-agnostic presentational primitives.
 *
 * Import everything from here:
 *   import { Card, Pill, PrimaryButton } from '@/components/gymmate';
 *
 * Rules: theme tokens only (no hardcoded hex), no data fetching, no store
 * access, strictly typed props, 44pt+ touch targets.
 */
export { Card, type CardProps } from './Card';
export { SectionTitle, type SectionTitleProps } from './SectionTitle';
export { Pill, type PillProps, type PillTone } from './Pill';
export { PrimaryButton, type PrimaryButtonProps } from './PrimaryButton';
export { GhostButton, type GhostButtonProps, type GhostTone } from './GhostButton';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';
export { StatTile, type StatTileProps, type StatTone } from './StatTile';
export { NumberStepper, type NumberStepperProps } from './NumberStepper';
export { ExerciseRow, type ExerciseRowProps } from './ExerciseRow';
export { VolumeBars, type VolumeBarsProps } from './VolumeBars';

// Exercise presentation — the media seam and its detail sheet.
export {
  ExerciseVisual,
  type ExerciseVisualProps,
  ExerciseDetailSheet,
  type ExerciseDetailSheetProps,
} from './exercise';

// Icon registry — semantic names only; colour always comes from GymMateTheme.
export {
  Icons,
  ICON_SIZE,
  ICON_STROKE,
  type IconName,
  type LucideIcon,
  type LucideProps,
} from './icons';
