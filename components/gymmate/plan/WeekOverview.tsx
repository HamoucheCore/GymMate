import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { Card, Pill } from '@/components/gymmate';
import { WEEKDAYS, type Schedule, type WeekdayKey } from '@/lib/gymmate/store';

export interface WeekOverviewProps {
  schedule: Schedule;
  selectedKey: WeekdayKey;
  /** Real current day — gets a live "Today" marker. */
  todayKey: WeekdayKey;
  onSelectDay: (key: WeekdayKey) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The day's label: the user's focus, or an honest fallback when unnamed. Shared
 * with Today, which shows the same day and must never print a blank heading or
 * a dangling ` · ` for a training day the user has not named yet.
 */
export function dayTitle(focus: string, rest: boolean): string {
  const trimmed = focus.trim();
  if (trimmed) return trimmed;
  return rest ? 'Rest' : 'Untitled day';
}

/** One short line of volume: what is actually planned for the day. */
function dayVolume(rest: boolean, count: number): string {
  if (rest) return count > 0 ? `${count} saved` : 'Recovery';
  if (count === 0) return 'No lifts yet';
  return count === 1 ? '1 exercise' : `${count} exercises`;
}

/**
 * The whole week on one surface: a divider-separated row per day showing the
 * focus title, a training/rest badge and the exercise count. Tapping a row
 * opens that day in the editor below. Renders its own card — no wrapper needed.
 */
export function WeekOverview({
  schedule,
  selectedKey,
  todayKey,
  onSelectDay,
  style,
}: WeekOverviewProps) {
  return (
    <Card padded={false} style={[s.clip, style]}>
      {WEEKDAYS.map((weekday, index) => {
        const day = schedule[weekday.key];
        const rest = day.rest;
        const selected = weekday.key === selectedKey;
        const count = day.exercises.length;
        const titled = day.focus.trim().length > 0;

        return (
          <Pressable
            key={weekday.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${weekday.label}. ${rest ? 'Rest day' : dayTitle(day.focus, false)}. ${dayVolume(
              rest,
              count,
            )}.`}
            accessibilityHint="Opens this day in the editor"
            onPress={() => onSelectDay(weekday.key)}
            style={({ pressed }) => [
              s.row,
              index > 0 ? s.rowDivider : null,
              selected ? s.rowSelected : null,
              pressed && !selected ? s.rowPressed : null,
            ]}>
            <View style={[s.plate, selected ? s.plateOn : rest ? s.plateRest : null]}>
              <Text
                style={[s.plateText, selected ? s.plateTextOn : rest ? s.plateTextRest : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {weekday.short}
              </Text>
            </View>

            <View style={s.body}>
              <Text style={[s.title, titled ? null : s.titleSoft]} numberOfLines={1}>
                {dayTitle(day.focus, rest)}
              </Text>
              <Text style={s.volume} numberOfLines={1}>
                {weekday.key === todayKey ? <Text style={s.today}>Today · </Text> : null}
                {dayVolume(rest, count)}
              </Text>
            </View>

            <Pill label={rest ? 'Rest' : 'Train'} tone={rest ? 'muted' : 'accent'} style={s.badge} />
          </Pressable>
        );
      })}
    </Card>
  );
}

const clip: ViewStyle = { overflow: 'hidden' };
const row: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 64,
};
const rowDivider: ViewStyle = { borderTopWidth: 1, borderTopColor: T.line };
const rowSelected: ViewStyle = { backgroundColor: T.surface2 };
const rowPressed: ViewStyle = { backgroundColor: T.pillBg };
const plate: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.plateBg,
  alignItems: 'center',
  justifyContent: 'center',
};
const plateOn: ViewStyle = { backgroundColor: T.accent, borderColor: T.accent };
const plateRest: ViewStyle = { backgroundColor: T.surface2 };
const plateText: TextStyle = { fontSize: 12, fontWeight: '800', color: T.accent };
const plateTextOn: TextStyle = { color: T.accentInk };
const plateTextRest: TextStyle = { color: T.muted };
const body: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const title: TextStyle = { fontSize: 14, fontWeight: '700', color: T.ink };
const titleSoft: TextStyle = { color: T.muted, fontWeight: '600' };
const volume: TextStyle = { fontSize: 12, fontFamily: T.fontMono, color: T.muted };
const today: TextStyle = { color: T.accent, fontWeight: '700' };
/* Pill defaults to alignSelf: 'flex-start', which would pin it to the top. */
const badge: ViewStyle = { alignSelf: 'center' };

const s = StyleSheet.create({
  clip,
  row,
  rowDivider,
  rowSelected,
  rowPressed,
  plate,
  plateOn,
  plateRest,
  plateText,
  plateTextOn,
  plateTextRest,
  body,
  title,
  titleSoft,
  volume,
  today,
  badge,
});
