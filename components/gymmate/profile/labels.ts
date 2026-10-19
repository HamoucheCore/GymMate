import { formatDateLabel } from '@/lib/gymmate/format';
import type { Goal } from '@/lib/gymmate/store';

/** Human wording for the profile goal. */
export function goalLabel(goal: Goal): string {
  return goal === 'gain' ? 'Gaining weight' : 'Losing weight';
}

/**
 * `profile.createdAt` is a full ISO timestamp, `formatDateLabel` wants a plain
 * `YYYY-MM-DD`. Returns `''` for a missing/unparseable stamp so callers can
 * skip the line instead of printing "Member since ".
 */
export function memberSinceLabel(createdAt: string): string {
  const date = createdAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDateLabel(date) : '';
}
