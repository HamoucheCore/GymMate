/**
 * Calendar primitives — the one implementation of "what day is it".
 *
 * Leaf module: no imports at all, so both `store.tsx` and `format.ts` can use it
 * without a cycle (`WeekdayKey` lives here for exactly that reason). Every date
 * key is a *local* `YYYY-MM-DD` string, never UTC, so "today" means the same day
 * for training and nutrition on every device.
 */

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Local (not UTC) date as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Real local weekday of "now". */
export function todayKey(now: Date = new Date()): WeekdayKey {
  const map: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[now.getDay()] ?? 'mon';
}

/** Monday of the week containing `now`, as a local `YYYY-MM-DD`. */
export function startOfWeekISO(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return todayISO(d);
}

/**
 * Local `YYYY-MM-DD` -> `Date`, or `null` when the string is not that exact
 * shape or has a zero year/month/day.
 *
 * Deliberately shape-only: `2026-02-31` parses to the rolled-over day. Callers
 * that must trust a string as a real day key go through `isISODate`, which adds
 * the round-trip check.
 */
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = Number(m[1] ?? '');
  const month = Number(m[2] ?? '');
  const day = Number(m[3] ?? '');
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Date` -> local `YYYY-MM-DD`. The inverse of `parseISODate`. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * A real local calendar date in `YYYY-MM-DD` form.
 *
 * The shape check alone is not enough: `2026-02-31` or `2026-13-40` matches the
 * pattern but would roll over silently and leave a meal that can never be
 * displayed for any real day, so the date is rebuilt and must round-trip through
 * `toISODate` unchanged before the string is trusted as a day key.
 */
export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = parseISODate(value);
  if (!date) return false;
  return toISODate(date) === value;
}

/** Monday = 0 for a local `YYYY-MM-DD` string. `-1` when unparseable. */
export function weekdayIndexFromISO(iso: string): number {
  const date = parseISODate(iso);
  if (!date) return -1;
  return (date.getDay() + 6) % 7;
}

/** Monday = 0 for a `Date`. */
export function weekdayIndex(now: Date = new Date()): number {
  return (now.getDay() + 6) % 7;
}
