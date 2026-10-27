import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GymMateTheme as T, MAX_CONTENT_WIDTH } from '@/constants/GymMateTheme';
import {
  Card,
  EmptyState,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  StatTile,
  VolumeBars,
} from '@/components/gymmate';
import { EntryRow } from '@/components/gymmate/profile';
import { parseISODate, weekdayIndex } from '@/lib/gymmate/date';
import {
  formatDateLabel,
  formatKm,
  formatMinutes,
  formatPace,
  parseDecimalInput,
} from '@/lib/gymmate/format';
import {
  WEEKDAYS,
  makeId,
  startOfWeekISO,
  todayISO,
  useGym,
  weeklyCardioKm,
  type CardioRun,
} from '@/lib/gymmate/store';

const MIN_KM = 0.5;
const MAX_KM = 42;
const MIN_MIN = 5;
const MAX_MIN = 300;

/** Kilometres run on each weekday of the current week, Monday → Sunday. */
function kmByDayThisWeek(runs: CardioRun[]): number[] {
  const monday = parseISODate(startOfWeekISO());
  // A real Monday always parses; the guard only keeps the return shape a chart
  // can render without inventing a "today".
  if (!monday) return Array.from({ length: 7 }, () => 0);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + offset);
    return todayISO(day);
  });

  const km = days.map(() => 0);
  for (const run of runs) {
    const index = days.indexOf(run.date);
    if (index >= 0) km[index] = (km[index] ?? 0) + run.km;
  }
  return km;
}

export default function CardioScreen() {
  const { state, dispatch } = useGym();
  const [km, setKm] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const runs = useMemo(
    () =>
      [...state.cardioRuns].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [state.cardioRuns],
  );
  const weekKm = useMemo(() => kmByDayThisWeek(state.cardioRuns), [state.cardioRuns]);
  const weekLabels = useMemo(() => WEEKDAYS.map((weekday) => weekday.short), []);
  const weekSummary = useMemo(
    () =>
      `Kilometres per day this week — ${weekKm
        .map((km, index) => `${weekLabels[index] ?? ''} ${formatKm(km)}`)
        .join(', ')}.`,
    [weekKm, weekLabels],
  );
  const weeklyTotal = useMemo(() => weeklyCardioKm(state.cardioRuns), [state.cardioRuns]);
  const allTimeKm = useMemo(() => runs.reduce((sum, run) => sum + run.km, 0), [runs]);

  const weekMax = Math.max(...weekKm);
  const latest = runs[0] ?? null;
  const pace = formatPace(parseDecimalInput(km), parseDecimalInput(minutes));
  const paceReady = pace !== '—';

  function saveRun() {
    const parsedKm = parseDecimalInput(km);
    const parsedMin = parseDecimalInput(minutes);
    const valid =
      Number.isFinite(parsedKm) &&
      Number.isFinite(parsedMin) &&
      parsedKm >= MIN_KM &&
      parsedKm <= MAX_KM &&
      parsedMin >= MIN_MIN &&
      parsedMin <= MAX_MIN;

    if (!valid) {
      setError(`Enter ${MIN_KM}–${MAX_KM} km and ${MIN_MIN}–${MAX_MIN} min.`);
      return;
    }

    setError(null);
    dispatch({
      type: 'ADD_RUN',
      run: { id: makeId('run'), km: parsedKm, minutes: parsedMin, date: todayISO() },
    });
    setKm('');
    setMinutes('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={runs}
          keyExtractor={(run) => run.id}
          renderItem={({ item: run }) => {
            const dateLabel = formatDateLabel(run.date);
            return (
              <View style={styles.column}>
                <EntryRow
                  title={formatKm(run.km)}
                  subtitle={`${dateLabel} · ${formatPace(run.km, run.minutes)}`}
                  value={formatMinutes(run.minutes)}
                  deleteLabel={`Delete ${formatKm(run.km)} run from ${dateLabel}`}
                  onDelete={() => dispatch({ type: 'REMOVE_RUN', id: run.id })}
                />
              </View>
            );
          }}
          ListHeaderComponent={
            <View style={styles.column}>
              <ScreenHeader
                title="Cardio"
                subtitle={
                  runs.length === 0
                    ? 'Nothing logged yet'
                    : `${runs.length} ${runs.length === 1 ? 'run' : 'runs'} · ${formatKm(allTimeKm)} all time`
                }
              />

              <View style={styles.tiles}>
                <StatTile
                  label="This week"
                  value={formatKm(weeklyTotal)}
                  hint="Mon → today"
                  tone={weeklyTotal > 0 ? 'accent' : 'muted'}
                />
                <StatTile
                  label="Last run"
                  value={latest ? formatKm(latest.km) : '—'}
                  hint={latest ? formatDateLabel(latest.date) : 'No runs yet'}
                />
              </View>

              <Card style={styles.block}>
                <Text style={styles.cardTitle}>Log a run</Text>
                <Text style={styles.cardSub}>Distance and time — pace is worked out for you.</Text>

                <Text style={styles.fieldLabel}>Distance (km)</Text>
                <TextInput
                  value={km}
                  onChangeText={setKm}
                  keyboardType="decimal-pad"
                  placeholder="5.2"
                  placeholderTextColor={T.muted}
                  accessibilityLabel="Distance in kilometres"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Duration (min)</Text>
                <TextInput
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={T.muted}
                  accessibilityLabel="Duration in minutes"
                  style={styles.input}
                />

                <View style={styles.paceRow}>
                  <Pill label={`Pace ${pace}`} tone={paceReady ? 'accent' : 'muted'} />
                  {paceReady ? <Text style={styles.paceNote}>Preview — not saved yet</Text> : null}
                </View>

                {error ? (
                  <Text
                    style={styles.error}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                ) : null}

                <PrimaryButton label="Save run" onPress={saveRun} style={styles.save} />
              </Card>

              {weekMax > 0 ? (
                <>
                  <SectionTitle title="This week" subtitle="Kilometres per day · Monday to Sunday" />
                  <VolumeBars
                    values={weekKm.map((day) => (day / weekMax) * 100)}
                    labels={weekLabels}
                    highlightIndex={weekdayIndex()}
                    summary={weekSummary}
                  />
                </>
              ) : null}

              {runs.length > 0 ? (
                <SectionTitle
                  title="History"
                  subtitle="Newest first"
                  action={<Pill label={`${runs.length}`} tone="muted" />}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, styles.column]}>
              <EmptyState
                title="No runs logged yet"
                body="Add your first run above and it will show up here with its pace and this week's total."
              />
            </View>
          }
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const safe: ViewStyle = { flex: 1, backgroundColor: T.bg };
const flex: ViewStyle = { flex: 1 };
// The scroll content stays full-bleed (padding only) so the background fills
// the screen; the content column caps and centres itself on wide screens,
// exactly as the ScrollView tab screens do.
const container: ViewStyle = {
  paddingHorizontal: 16,
  paddingBottom: 40,
  backgroundColor: T.bg,
};
const column: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };
const tiles: ViewStyle = { flexDirection: 'row', gap: 10, marginBottom: 14 };
const block: ViewStyle = { marginBottom: 14 };
const cardTitle: TextStyle = { color: T.ink, fontSize: 16, fontWeight: '800' };
const cardSub: TextStyle = { color: T.muted, fontSize: 12, marginTop: 4 };
const fieldLabel: TextStyle = {
  color: T.label,
  fontSize: 12,
  fontWeight: '700',
  marginTop: 14,
  marginBottom: 6,
};
const input: TextStyle = {
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 48,
  color: T.ink,
  fontSize: 16,
  fontFamily: T.fontMono,
};
const paceRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 };
const paceNote: TextStyle = { fontSize: 11, color: T.muted, flexShrink: 1 };
const error: TextStyle = { color: T.danger, fontSize: 12, marginTop: 12 };
const save: ViewStyle = { marginTop: 16 };
const emptyWrap: ViewStyle = { marginTop: 4 };

const styles = StyleSheet.create({
  safe,
  flex,
  container,
  column,
  tiles,
  block,
  cardTitle,
  cardSub,
  fieldLabel,
  input,
  paceRow,
  paceNote,
  error,
  save,
  emptyWrap,
});
