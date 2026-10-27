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
 * - Icons are imported per-module (`lucide-react-native/icons/<kebab>`), never
 *   from the package barrel: Metro does not tree-shake, so a barrel import ships
 *   all ~1.9k icons (~1.7 MB) when only 17 are used.
 */
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Check from 'lucide-react-native/icons/check';
import Droplet from 'lucide-react-native/icons/droplet';
import Drumstick from 'lucide-react-native/icons/drumstick';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Flame from 'lucide-react-native/icons/flame';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Salad from 'lucide-react-native/icons/salad';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import User from 'lucide-react-native/icons/user';
import Wheat from 'lucide-react-native/icons/wheat';
import X from 'lucide-react-native/icons/x';
import type { LucideIcon, LucideProps } from 'lucide-react-native';

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
  /* Nutrition — food, energy and the three macros. */
  nutrition: Salad,
  calories: Flame,
  protein: Drumstick,
  carbs: Wheat,
  fat: Droplet,
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
