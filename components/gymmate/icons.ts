/**
 * GymMate icon registry — the single source of truth for every icon in the app.
 *
 * Convention:
 * - All icons come from `lucide-react-native` and are reached *only* through
 *   this registry, using the semantic `Icons` keys. Do not import icon
 *   components directly from the library in app code.
 * - Callers must pass `color` from `GymMateTheme` (`@/constants/GymMateTheme`)
 *   and a size from `ICON_SIZE`. Never hardcode a hex value here or at the
 *   call site — `constants/GymMateTheme.ts` is the only file allowed to hold
 *   a hex value.
 * - Never use an emoji or a bare Unicode glyph (`✓`, `✕`, `↑`, …) as an icon;
 *   render `<Icons.someName color={T.…} size={ICON_SIZE.md} />` instead.
 */
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react-native';

/** Semantic icon map: use these keys, never raw lucide component names. */
export const Icons = {
  exercise: Dumbbell,
  check: Check,
  remove: X,
  moveUp: ArrowUp,
  moveDown: ArrowDown,
  decrement: Minus,
  increment: Plus,
  back: ArrowLeft,
  goalLose: TrendingDown,
  goalGain: TrendingUp,
  tabToday: CalendarDays,
  tabPlan: Dumbbell,
  tabCardio: Flame,
  tabProgress: TrendingUp,
  tabYou: User,
} as const satisfies Record<string, LucideIcon>;

/** Any valid key of the semantic icon registry. */
export type IconName = keyof typeof Icons;

export type { LucideIcon, LucideProps };

/** Standard icon sizes (px). */
export const ICON_SIZE = {
  sm: 16,
  md: 18,
  lg: 22,
  tab: 24,
} as const;

/** Default stroke width matching the lucide house style. */
export const ICON_STROKE = 2;
