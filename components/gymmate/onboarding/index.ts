/**
 * Onboarding flow primitives — owned by the onboarding agent.
 *
 * These are deliberately local to the first-run flow (not exported from the
 * top-level `components/gymmate` barrel) so the shared design system stays
 * focused on route-agnostic primitives.
 */
export { OnboardingProgress, type OnboardingProgressProps } from './OnboardingProgress';
export { StepTransition, type StepTransitionProps } from './StepTransition';
export { GoalCard, type GoalCardProps, type GoalKind } from './GoalCard';
export { OnboardingInput, type OnboardingInputProps } from './OnboardingInput';
export { RecapRow, type RecapRowProps } from './RecapRow';
export { PlateMark, type PlateMarkProps } from './PlateMark';
