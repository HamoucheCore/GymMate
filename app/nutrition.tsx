/**
 * Nutrition — the full calorie and macro tracker.
 *
 * A root-stack route (not a sixth tab), opened from the Today card and the You
 * hub. Every figure comes from the store: `mealsForDate` / `nutritionTotalsForDate`
 * for today, `latestWeight` + the profile goal for the targets, and the same meal
 * list re-summed per day for the 7-day chart. Nothing here is seeded.
 *
 * The screen has no native header, so the `Back` ghost button is the visible way
 * out on web and Android; iOS still gets the swipe-back gesture.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Card,
  EmptyState,
  GhostButton,
  Pill,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
  VolumeBars,
} from '@/components/gymmate';
import {
  AddMealSheet,
  MealRow,
  NutritionOverview,
  type MealDraft,
} from '@/components/gymmate/nutrition';
import { goalLabel } from '@/components/gymmate/profile';
import { GymMateTheme as T, MAX_CONTENT_WIDTH } from '@/constants/GymMateTheme';
import { formatDateLabel, formatKcal } from '@/lib/gymmate/format';
import { nutritionTargetFor } from '@/lib/gymmate/nutrition';
import {
  latestWeight,
  makeId,
  mealsForDate,
  nutritionTotalsForDate,
  todayISO,
  useGym,
} from '@/lib/gymmate/store';

/* ----------------------------------------------------------------- helpers */

/** Single-letter weekday labels, indexed by `Date.getDay()` (Sunday = 0). */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The seven local dates ending today, oldest first.
 *
 * Built from local calendar parts (`new Date(y, m, d)`) exactly like `todayISO`,
 * so a device east or west of UTC never shifts a bar onto the wrong day.
 */
function lastSevenDays(now: Date): { iso: string; label: string }[] {
  const days: { iso: string; label: string }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    day.setDate(day.getDate() - offset);
    days.push({ iso: todayISO(day), label: WEEKDAY_INITIALS[day.getDay()] ?? '' });
  }
  return days;
}

/* ------------------------------------------------------------------- screen */

export default function NutritionScreen() {
  const { state, dispatch } = useGym();
  const [sheetOpen, setSheetOpen] = useState(false);

  // The day key is state, not a per-render call: `meals`, `totals` and the week
  // window all hinge on it, and a value recomputed on every render would leave
  // them pinned to yesterday until some unrelated state changed the screen.
  const [iso, setIso] = useState(() => todayISO());
  useEffect(() => {
    const id = setInterval(() => {
      const current = todayISO();
      setIso((previous) => (previous === current ? previous : current));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const meals = useMemo(() => mealsForDate(state.meals, iso), [state.meals, iso]);
  const totals = useMemo(() => nutritionTotalsForDate(state.meals, iso), [state.meals, iso]);
  const weight = latestWeight(state.bodyweights);
  const target = nutritionTargetFor(state.profile, weight);
  const goal = state.profile?.goal ?? 'lose';

  /**
   * Percent of the daily target eaten per day. A missing target is an honest
   * all-zero chart, never a full one. `targetCalories` is hoisted so the memo
   * only recomputes when the number itself changes.
   */
  const targetCalories = target ? target.calories : null;

  const week = useMemo(() => {
    // `iso` is not read directly here, but it is the day anchor: the interval
    // above flips it at local midnight, and that state change — not a stray
    // re-render — is what re-runs this and slides the seven-day window along.
    const days = lastSevenDays(new Date());
    const caloriesPerDay = days.map((day) => nutritionTotalsForDate(state.meals, day.iso).calories);
    const weekTotal = caloriesPerDay.reduce((sum, calories) => sum + calories, 0);
    const values = caloriesPerDay.map((calories) =>
      targetCalories === null ? 0 : Math.min(100, Math.round((calories / targetCalories) * 100)),
    );
    let overDays = 0;
    if (targetCalories !== null) {
      for (const calories of caloriesPerDay) {
        if (calories > targetCalories) overDays += 1;
      }
    }
    return { values, labels: days.map((day) => day.label), weekTotal, overDays };
  }, [state.meals, targetCalories, iso]);

  const weekSummary = `${formatKcal(week.weekTotal)} over 7 days · avg ${formatKcal(week.weekTotal / 7)} a day${
    target ? ` · ${formatKcal(target.calories)} target` : ''
  }${week.overDays > 0 ? ` · ${week.overDays} ${week.overDays === 1 ? 'day' : 'days'} over target` : ''}`;

  function addMeal(draft: MealDraft) {
    dispatch({
      type: 'ADD_MEAL',
      meal: {
        ...draft,
        id: makeId('meal'),
        date: iso,
        createdAt: new Date().toISOString(),
      },
    });
    AccessibilityInfo.announceForAccessibility(`${draft.name} logged.`);
    setSheetOpen(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.column}>
          <ScreenHeader
            title="Nutrition"
            subtitle={
              target
                ? `${goalLabel(goal)} · ${formatKcal(target.calories)} target`
                : 'Calories and macros, tracked daily'
            }
            trailing={
              <GhostButton
                label="Back"
                fullWidth={false}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)');
                  }
                }}
                accessibilityHint="Returns to the screen you came from"
              />
            }
          />

          {state.profile ? (
            <Card>
              <NutritionOverview totals={totals} target={target} goal={goal} />
            </Card>
          ) : (
            <EmptyState
              title="No targets yet"
              body="Add your name, goal and starting weight and GymMate estimates calorie and macro targets."
              actionLabel="Set up profile"
              onAction={() => router.replace('/onboarding')}
            />
          )}

          <PrimaryButton
            label="Log a meal"
            onPress={() => setSheetOpen(true)}
            accessibilityHint="Opens the meal form for today"
            style={s.cta}
          />

          <SectionTitle
            title="Today's meals"
            subtitle={
              meals.length === 0
                ? 'Nothing logged yet'
                : `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} · ${formatKcal(totals.calories)}`
            }
            action={<Pill label={`${meals.length}`} tone="muted" />}
            style={s.section}
          />

          {meals.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              body="Log breakfast, lunch, dinner or a snack and today's calories and macros fill in."
            />
          ) : (
            <View>
              {meals.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  onDelete={() => dispatch({ type: 'REMOVE_MEAL', id: meal.id })}
                  style={s.mealRow}
                />
              ))}
            </View>
          )}

          <SectionTitle
            title="Last 7 days"
            subtitle={target ? 'Calories against your daily target' : 'Calories logged per day'}
            style={s.section}
          />
          {week.weekTotal === 0 ? (
            <EmptyState
              title="No meals in the last 7 days"
              body="Log a meal and this week's chart fills in."
            />
          ) : (
            <>
              <VolumeBars
                values={week.values}
                labels={week.labels}
                highlightIndex={6}
                summary={weekSummary}
              />
              {/* The bars already announce this; the visible copy is decorative. */}
              <Text style={s.summary} accessible={false}>
                {weekSummary}
              </Text>
            </>
          )}

          <Text style={s.note}>
            Targets follow your goal and latest weigh-in. Estimates only — not medical advice.
          </Text>
          <Text style={s.noteSub}>Meals stay on this device.</Text>
        </View>
      </ScrollView>

      <AddMealSheet
        visible={sheetOpen}
        dateLabel={formatDateLabel(iso)}
        onClose={() => setSheetOpen(false)}
        onSubmit={addMeal}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ styles */

const safe: ViewStyle = { flex: 1, backgroundColor: T.bg };
// Full-bleed scroll content so the background always fills the screen…
const content: ViewStyle = { paddingHorizontal: 16, paddingBottom: 40, backgroundColor: T.bg };
// …while the content column caps and centres itself on tablets and desktop web.
const column: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };
const section: ViewStyle = { marginTop: 22 };
const cta: ViewStyle = { marginTop: 14 };
const mealRow: ViewStyle = { marginBottom: 8 };
const summary: TextStyle = {
  fontSize: 12,
  color: T.muted,
  marginTop: 8,
  paddingHorizontal: 2,
  fontFamily: T.fontMono,
};
const note: TextStyle = {
  fontSize: 12,
  color: T.muted,
  textAlign: 'center',
  marginTop: 22,
  lineHeight: 18,
};
const noteSub: TextStyle = { fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 6 };

const s = StyleSheet.create({
  safe,
  content,
  column,
  section,
  cta,
  mealRow,
  summary,
  note,
  noteSub,
});
