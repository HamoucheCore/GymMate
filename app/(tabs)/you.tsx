import { ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GymMateTheme as T, MAX_CONTENT_WIDTH } from '@/constants/GymMateTheme';
import {
  Card,
  EmptyState,
  GhostButton,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  StatTile,
} from '@/components/gymmate';
import { ConfirmAction, goalLabel, memberSinceLabel } from '@/components/gymmate/profile';
import { formatGrams, formatKcal, formatKm } from '@/lib/gymmate/format';
import {
  logsThisWeek,
  nutritionTotalsForDate,
  streakFromLogs,
  todayISO,
  useGym,
  weeklyCardioKm,
} from '@/lib/gymmate/store';

/**
 * `/onboarding` is a real route in the root stack, so typed routes resolve both
 * hrefs without a cast.
 */
const ONBOARDING = '/onboarding' as const;
const ONBOARDING_EDIT = '/onboarding?edit=1' as const;

export default function YouScreen() {
  const { state, dispatch } = useGym();
  const profile = state.profile;

  const streak = streakFromLogs(state.logs);
  const weekWorkouts = logsThisWeek(state.logs);
  const weekCardioKm = weeklyCardioKm(state.cardioRuns);
  const workouts = state.logs.length;
  const since = profile ? memberSinceLabel(profile.createdAt) : '';
  const initial = profile ? profile.name.trim().charAt(0).toUpperCase() || '?' : '?';
  const gain = profile?.goal === 'gain';
  const canReset =
    profile !== null ||
    state.logs.length > 0 ||
    state.cardioRuns.length > 0 ||
    state.bodyweights.length > 0 ||
    state.meals.length > 0;
  // Cheap enough to recompute every render; no memo for a today-only sum.
  const totals = nutritionTotalsForDate(state.meals, todayISO());

  function resetEverything() {
    dispatch({ type: 'RESET_ALL' });
    router.replace(ONBOARDING);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <ScreenHeader
            title="You"
            subtitle={profile ? goalLabel(profile.goal) : 'No profile yet'}
          />

          {profile ? (
            <Card style={styles.block}>
              <View style={styles.identity}>
                <View style={[styles.avatar, gain ? styles.avatarGain : styles.avatarLose]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <Text style={styles.name}>{profile.name}</Text>
                <View style={styles.pills}>
                  <Pill label={goalLabel(profile.goal)} />
                  {profile.heightCm ? (
                    <Pill label={`${Math.round(profile.heightCm)} cm`} tone="muted" />
                  ) : null}
                </View>
                {since ? <Text style={styles.meta}>Member since {since}</Text> : null}
              </View>

              <PrimaryButton
                label="Edit profile"
                onPress={() => router.push(ONBOARDING_EDIT)}
                accessibilityHint="Opens your name, goal and target weight"
                style={styles.edit}
              />
            </Card>
          ) : (
            <EmptyState
              title="No profile yet"
              body="Add your name, goal and starting weight so your streak, cardio and weigh-ins have something to measure against."
              actionLabel="Set up profile"
              onAction={() => router.replace(ONBOARDING)}
              style={styles.block}
            />
          )}

          <SectionTitle title="Your numbers" subtitle="Counted from what you have logged" />
          <View style={styles.gridRow}>
            <StatTile
              label="Streak"
              value={`${streak}`}
              hint={streak === 1 ? 'day in a row' : 'days in a row'}
              tone={streak > 0 ? 'accent' : 'muted'}
            />
            <StatTile label="This week" value={`${weekWorkouts}`} hint="workouts" />
          </View>
          <View style={styles.gridRow}>
            <StatTile
              label="Cardio"
              value={state.cardioRuns.length > 0 ? formatKm(weekCardioKm) : '—'}
              hint={state.cardioRuns.length > 0 ? 'this week' : 'no runs yet'}
            />
            <StatTile label="All time" value={`${workouts}`} hint="workouts logged" />
          </View>

          <SectionTitle title="Nutrition" subtitle="Today's calories and macros" />
          <Card style={styles.block}>
            <Text style={styles.cardTitle}>Today at a glance</Text>
            <Text
              style={
                styles.cardSub
              }>{`${formatKcal(totals.calories)} · P ${formatGrams(totals.protein)} · C ${formatGrams(totals.carbs)} · F ${formatGrams(totals.fat)}`}</Text>
            <GhostButton
              label="Open nutrition tracker"
              onPress={() => router.push('/nutrition')}
              style={styles.nutritionCta}
            />
          </Card>

          <Card style={styles.block}>
            <Text style={styles.cardTitle}>Your data</Text>
            <Text style={styles.cardSub}>
              Everything you log stays in local storage on this device. No account, no cloud sync.
            </Text>

            {canReset ? (
              <ConfirmAction
                label="Reset everything"
                title="Reset everything?"
                message="This erases your profile, weekly schedule, workout logs, runs, weigh-ins and meals from this device. It cannot be undone."
                confirmLabel="Erase everything"
                cancelLabel="Keep it"
                onConfirm={resetEverything}
                style={styles.confirm}
              />
            ) : (
              <Text style={styles.cardSub}>Nothing logged yet — there is nothing to reset.</Text>
            )}
          </Card>

          <Text style={styles.note}>Weights in kilograms · dark only</Text>
          <Text style={styles.credit}>Exercise media © Gym visual — https://gymvisual.com/</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const safe: ViewStyle = { flex: 1, backgroundColor: T.bg };
const container: ViewStyle = { paddingHorizontal: 16, paddingBottom: 40, backgroundColor: T.bg };
// Phone-first: the column caps and centres itself on wide screens while the
// scroll content stays full-bleed so the background still fills the screen.
const column: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };
const block: ViewStyle = { marginBottom: 14 };
const identity: ViewStyle = { alignItems: 'center', gap: 4 };
const avatar: ViewStyle = {
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
};
const avatarLose: ViewStyle = { backgroundColor: T.goalLose };
const avatarGain: ViewStyle = { backgroundColor: T.goalGain };
const avatarText: TextStyle = { fontSize: 26, fontWeight: '800', color: T.accentInk };
const name: TextStyle = { fontSize: 21, fontWeight: '800', color: T.ink, letterSpacing: -0.3 };
const pills: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
  marginTop: 8,
};
const meta: TextStyle = {
  fontSize: 12,
  color: T.muted,
  marginTop: 8,
  fontFamily: T.fontMonoMedium,
};
const edit: ViewStyle = { marginTop: 16 };
const gridRow: ViewStyle = { flexDirection: 'row', gap: 10, marginBottom: 10 };
const cardTitle: TextStyle = { color: T.ink, fontSize: 16, fontWeight: '800' };
const cardSub: TextStyle = { color: T.muted, fontSize: 12, marginTop: 6, lineHeight: 18 };
const confirm: ViewStyle = { marginTop: 14 };
const nutritionCta: ViewStyle = { marginTop: 14 };
const note: TextStyle = { color: T.muted, fontSize: 12, textAlign: 'center', marginTop: 6 };
const credit: TextStyle = { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 12 };

const styles = StyleSheet.create({
  safe,
  container,
  column,
  block,
  identity,
  avatar,
  avatarLose,
  avatarGain,
  avatarText,
  name,
  pills,
  meta,
  edit,
  gridRow,
  cardTitle,
  cardSub,
  confirm,
  nutritionCta,
  note,
  credit,
});
