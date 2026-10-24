/**
 * Pure display formatters. No React, no hooks, no state — safe anywhere.
 * Every helper tolerates junk input and returns a string, never throws.
 */

/** Round to 1 decimal place without float dust. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fixed(n: number, digits: number): string {
  return Number.isFinite(n) ? n.toFixed(digits) : '0';
}

/**
 * `78.2` -> `'78.2 kg'`.
 *
 * Non-finite or absent input returns `'—'` — never a plausible-looking `'0.0 kg'`,
 * because a missing weight means "unknown", not zero.
 */
export function formatKg(kg: number): string {
  if (!Number.isFinite(kg)) return '—';
  return `${fixed(round1(kg), 1)} kg`;
}

/** `5.25` -> `'5.3 km'` */
export function formatKm(km: number): string {
  return `${fixed(round1(km), 1)} km`;
}

/** `28` -> `'28 min'`, `75` -> `'1h 15m'` */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${`${m}`.padStart(2, '0')}m`;
}

/** `(5.2, 28)` -> `'5:23 /km'`. Returns `'—'` when pace is undefined. */
export function formatPace(km: number, minutes: number): string {
  if (!(km > 0) || !(minutes > 0)) return '—';
  const totalSeconds = Math.round((minutes / km) * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${`${s}`.padStart(2, '0')} /km`;
}

/** `0.4` -> `'+0.4'`, `-0.4` -> `'-0.4'`, `0` -> `'0.0'` */
export function formatSigned(n: number): string {
  const value = round1(n);
  if (value > 0) return `+${fixed(value, 1)}`;
  return fixed(value, 1);
}

/** `12` -> `'3 × 4'`-style set/reps summary. */
export function formatSets(sets: number, reps: number): string {
  return `${Math.max(0, Math.round(sets))} × ${Math.max(0, Math.round(reps))}`;
}

/**
 * Join the non-empty, trimmed parts with a separator (`' · '` by default).
 * `undefined`/`null` parts are dropped, so an absent muscle group never leaves
 * a dangling separator like `' · Cable'` on screen.
 */
export function joinParts(
  parts: readonly (string | null | undefined)[],
  separator = ' · ',
): string {
  return parts
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(separator);
}

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = Number(m[1] ?? '');
  const month = Number(m[2] ?? '');
  const day = Number(m[3] ?? '');
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * `'2026-10-18'` -> `'Today'` / `'Yesterday'` / `'Sat 18 Oct'`.
 * `now` is injectable for tests; defaults to the real clock.
 */
export function formatDateLabel(iso: string, now: Date = new Date()): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = toISO(date);
  if (target === toISO(today)) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target === toISO(yesterday)) return 'Yesterday';

  const day = DAYS[date.getDay()] ?? '';
  const month = MONTHS[date.getMonth()] ?? '';
  return `${day} ${date.getDate()} ${month}`.trim();
}

/**
 * Whole number with `,` thousands separators, grouped by hand.
 *
 * Not `toLocaleString`/`Intl`: Hermes builds and web targets are not guaranteed
 * to ship the same locale data, and a calorie figure must read identically on
 * every device. `format.ts` stays a leaf module — no imports, no Intl.
 */
function groupedInteger(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = `${Math.abs(rounded)}`;
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    // A separator goes before every group of three counted from the right.
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits.charAt(i);
  }
  return `${sign}${out}`;
}

/** `1925` -> `'1,925 kcal'`; non-finite -> `'—'`. */
export function formatKcal(kcal: number): string {
  if (!Number.isFinite(kcal)) return '—';
  return `${groupedInteger(kcal)} kcal`;
}

/** `150` -> `'150 g'`; non-finite -> `'—'`. */
export function formatGrams(grams: number): string {
  if (!Number.isFinite(grams)) return '—';
  return `${groupedInteger(grams)} g`;
}
