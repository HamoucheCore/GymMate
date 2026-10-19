/**
 * Today-only: the "already trained" summary.
 *
 * Renders only real values pulled out of today's `WorkoutLog`s — no invented
 * tonnage, no planned-minutes guesses. Replaces the primary CTA so the screen
 * never asks the user to start a session they already finished.
 */
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Card, GhostButton, Icons, ICON_SIZE, ICON_STROKE, Pill } from '@/components/gymmate';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import type { WorkoutLog } from '@/lib/gymmate/store';

export interface LoggedTodayCardProps {
  /** Today's logs, newest first. */
  logs: WorkoutLog[];
  /**
   * Omit on days with no scheduled session — the logger only exists on a
   * training day, so a button here would open nothing.
   */
  onLogAnother?: () => void;
}

function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const h = `${date.getHours()}`.padStart(2, '0');
  const m = `${date.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function LoggedTodayCard({ logs, onLogAnother }: LoggedTodayCardProps) {
  const latest = logs[0];
  if (!latest) return null;

  let exerciseCount = 0;
  let setCount = 0;
  for (const log of logs) {
    exerciseCount += log.exercises.length;
    for (const exercise of log.exercises) setCount += exercise.sets.length;
  }

  const finishedAt = clockTime(latest.completedAt);
  const subtitle = finishedAt
    ? `${latest.focus} · finished ${finishedAt}`
    : `${latest.focus} · saved today`;

  return (
    <Card>
      <View style={s.head}>
        <View style={s.badge} accessible={false}>
          <Icons.check color={T.accentInk} size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
        </View>
        <View style={s.headText}>
          <Text style={s.title} accessibilityRole="header">
            Logged today
          </Text>
          <Text style={s.sub}>{subtitle}</Text>
        </View>
        {logs.length > 1 ? <Pill label={`${logs.length} sessions`} /> : null}
      </View>

      <View style={s.pills}>
        <Pill label={`${exerciseCount} ${plural(exerciseCount, 'exercise', 'exercises')}`} />
        <Pill label={`${setCount} ${plural(setCount, 'set', 'sets')}`} />
      </View>

      {onLogAnother ? (
        <GhostButton
          label="Log another session"
          onPress={onLogAnother}
          accessibilityHint="Opens the set logger for a second session today"
          style={s.action}
        />
      ) : null}
    </Card>
  );
}

const head: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12 };
const badge: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: T.accent,
  alignItems: 'center',
  justifyContent: 'center',
};
const headText: ViewStyle = { flex: 1, gap: 2, minWidth: 0 };
const title: TextStyle = { fontSize: 15, fontWeight: '800', color: T.ink };
const sub: TextStyle = { fontSize: 12, color: T.muted, fontFamily: T.fontMono };
const pills: ViewStyle = { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 };
const action: ViewStyle = { marginTop: 16 };

const s = StyleSheet.create({ head, badge, headText, title, sub, pills, action });
