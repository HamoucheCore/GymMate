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
import { Card, EmptyState, Pill, PrimaryButton, ScreenHeader, SectionTitle } from '@/components/gymmate';
import { EntryRow, GoalProgress, WeightTrend, goalLabel } from '@/components/gymmate/profile';
import { formatDateLabel, formatKg, formatSigned } from '@/lib/gymmate/format';
import {
  goalProgress,
  latestWeight,
  makeId,
  todayISO,
  useGym,
  weightDelta,
} from '@/lib/gymmate/store';

const MIN_KG = 30;
const MAX_KG = 250;
const TREND_LIMIT = 10;

/** Comma-tolerant parse — decimal-pad keyboards emit ',' in some locales. */
function toNumber(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

export default function ProgressScreen() {
  const { state, dispatch } = useGym();
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      [...state.bodyweights].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [state.bodyweights],
  );

  const profile = state.profile;
  const current = latestWeight(state.bodyweights);
  const delta = weightDelta(profile, state.bodyweights);
  const progress = goalProgress(profile, state.bodyweights);
  const newest = entries[0] ?? null;
  const gain = profile?.goal === 'gain';

  function addWeight() {
    const parsed = toNumber(weight);
    if (!Number.isFinite(parsed) || parsed < MIN_KG || parsed > MAX_KG) {
      setError(`Enter a bodyweight between ${MIN_KG} and ${MAX_KG} kg.`);
      return;
    }

    setError(null);
    dispatch({ type: 'ADD_WEIGHT', entry: { id: makeId('weight'), kg: parsed, date: todayISO() } });
    setWeight('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item: entry, index }) => {
            const previous = entries[index + 1] ?? null;
            const dateLabel = formatDateLabel(entry.date);
            const step = previous ? formatSigned(entry.kg - previous.kg) : null;
            return (
              <View style={styles.column}>
                <EntryRow
                  title={formatKg(entry.kg)}
                  subtitle={step ? `${dateLabel} · ${step} kg vs previous` : dateLabel}
                  deleteLabel={`Delete ${formatKg(entry.kg)} weigh-in from ${dateLabel}`}
                  onDelete={() => dispatch({ type: 'REMOVE_WEIGHT', id: entry.id })}
                />
              </View>
            );
          }}
          ListHeaderComponent={
            <View style={styles.column}>
              <ScreenHeader
                title="Progress"
                subtitle={
                  profile
                    ? `${goalLabel(profile.goal)} · ${formatKg(profile.startWeight)} → ${formatKg(profile.targetWeight)}`
                    : 'Bodyweight and goal tracking'
                }
              />

              {profile ? (
                <Card style={styles.block}>
                  <View style={styles.head}>
                    <View style={styles.headMain}>
                      <Text style={styles.kicker}>Current weight</Text>
                      <Text style={styles.big}>{current === null ? '—' : formatKg(current)}</Text>
                      <Text style={styles.headSub}>
                        {newest
                          ? `${formatDateLabel(newest.date)} · ${entries.length} ${
                              entries.length === 1 ? 'entry' : 'entries'
                            }`
                          : 'No weigh-ins yet'}
                      </Text>
                    </View>

                    <View style={styles.delta}>
                      <Text
                        style={[styles.deltaValue, gain ? styles.textGain : styles.textLose]}
                        accessibilityLabel={
                          delta === null
                            ? 'Change since start: no weigh-ins yet'
                            : `Change since start: ${formatSigned(delta)} kg`
                        }>
                        {delta === null ? '—' : `${formatSigned(delta)} kg`}
                      </Text>
                      <Text style={styles.deltaNote}>vs start</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <GoalProgress
                    value={progress}
                    goal={profile.goal}
                    startWeight={profile.startWeight}
                    targetWeight={profile.targetWeight}
                    currentWeight={current}
                  />
                </Card>
              ) : (
                <EmptyState
                  title="No goal yet"
                  body="Your start weight, target and progress bar appear here once your profile is set up."
                  style={styles.block}
                />
              )}

              {entries.length >= 2 ? (
                <>
                  <SectionTitle
                    title="Trend"
                    subtitle={`Last ${Math.min(entries.length, TREND_LIMIT)} weigh-ins`}
                  />
                  <Card style={styles.block}>
                    <WeightTrend entries={state.bodyweights} limit={TREND_LIMIT} />
                  </Card>
                </>
              ) : null}

              <Card style={styles.block}>
                <Text style={styles.cardTitle}>Add weigh-in</Text>
                <Text style={styles.cardSub}>
                  Weigh in under the same conditions each time — the trend matters more than the
                  number.
                </Text>

                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="78.0"
                  placeholderTextColor={T.muted}
                  accessibilityLabel="Bodyweight in kilograms"
                  style={styles.input}
                />

                {error ? (
                  <Text
                    style={styles.error}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                ) : null}

                <PrimaryButton label="Add weigh-in" onPress={addWeight} style={styles.save} />
              </Card>

              {entries.length > 0 ? (
                <SectionTitle
                  title="History"
                  subtitle="Newest first"
                  action={<Pill label={`${entries.length}`} tone="muted" />}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.emptyWrap, styles.column]}>
              <EmptyState
                title="No weigh-ins yet"
                body="Add your first weigh-in above to start the trend and unlock goal progress."
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
const block: ViewStyle = { marginBottom: 14 };
const head: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start', gap: 12 };
const headMain: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const kicker: TextStyle = { fontSize: 12, color: T.muted };
const big: TextStyle = { fontSize: 34, color: T.ink, letterSpacing: -1, fontFamily: T.fontMonoBold };
const headSub: TextStyle = { fontSize: 12, color: T.muted };
const delta: ViewStyle = { alignItems: 'flex-end', gap: 2 };
const deltaValue: TextStyle = { fontSize: 18, fontFamily: T.fontMonoBold };
const deltaNote: TextStyle = { fontSize: 11, color: T.muted };
const textLose: TextStyle = { color: T.goalLose };
const textGain: TextStyle = { color: T.goalGain };
const divider: ViewStyle = { height: 1, backgroundColor: T.line, marginVertical: 14 };
const cardTitle: TextStyle = { color: T.ink, fontSize: 16, fontWeight: '800' };
const cardSub: TextStyle = { color: T.muted, fontSize: 12, marginTop: 4, lineHeight: 18 };
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
const error: TextStyle = { color: T.danger, fontSize: 12, marginTop: 12 };
const save: ViewStyle = { marginTop: 16 };
const emptyWrap: ViewStyle = { marginTop: 4 };

const styles = StyleSheet.create({
  safe,
  flex,
  container,
  column,
  block,
  head,
  headMain,
  kicker,
  big,
  headSub,
  delta,
  deltaValue,
  deltaNote,
  textLose,
  textGain,
  divider,
  cardTitle,
  cardSub,
  fieldLabel,
  input,
  error,
  save,
  emptyWrap,
});
