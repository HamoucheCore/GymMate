import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Card,
  GhostButton,
  ICON_SIZE,
  ICON_STROKE,
  Icons,
  NumberStepper,
  PrimaryButton,
} from '@/components/gymmate';
import {
  GoalCard,
  OnboardingInput,
  OnboardingProgress,
  PlateMark,
  RecapRow,
  StepTransition,
} from '@/components/gymmate/onboarding';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { round1 } from '@/lib/gymmate/format';
import { useGym, type Goal } from '@/lib/gymmate/store';

type StepId = 'welcome' | 'name' | 'body' | 'goal' | 'summary';

/** First-run sequence. Edit mode drops the welcome so the user lands on a field. */
const FIRST_RUN_STEPS: StepId[] = ['welcome', 'name', 'body', 'goal', 'summary'];
const EDIT_STEPS: StepId[] = ['name', 'body', 'goal', 'summary'];

const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250;

/**
 * Nudge a target onto the correct side of the start weight for the chosen goal
 * (lose → below, gain → above). Keeps persisted profile data coherent so
 * `goalProgress` can never run backwards. An already-consistent target is
 * returned untouched.
 */
function normalizeTarget(goal: Goal, startWeight: number, targetWeight: number): number {
  if (goal === 'lose' && targetWeight >= startWeight) {
    return round1(Math.max(WEIGHT_MIN, startWeight - 5));
  }
  if (goal === 'gain' && targetWeight <= startWeight) {
    return round1(Math.min(WEIGHT_MAX, startWeight + 5));
  }
  return targetWeight;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { state, dispatch } = useGym();
  const profile = state.profile;

  // Edit mode is only valid when a profile actually exists.
  const isEdit = edit === '1' && profile !== null;
  const steps = useMemo<StepId[]>(() => (isEdit ? EDIT_STEPS : FIRST_RUN_STEPS), [isEdit]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Prefill from the existing profile in edit mode; otherwise sensible defaults.
  const [name, setName] = useState<string>(() => profile?.name ?? '');
  const [startWeight, setStartWeight] = useState<number>(() => profile?.startWeight ?? 75);
  const [targetWeight, setTargetWeight] = useState<number>(() => profile?.targetWeight ?? 70);
  const [goal, setGoal] = useState<Goal>(() => profile?.goal ?? 'lose');

  const step: StepId = steps[index] ?? 'welcome';
  const trimmedName = name.trim();
  const canAdvance = step === 'name' || step === 'summary' ? trimmedName.length > 0 : true;
  const canGoBack = index > 0 || isEdit;
  const goalTint = goal === 'lose' ? T.goalLose : T.goalGain;

  // The target the rest of the flow shows and saves: always coherent with the
  // chosen goal and the current start weight.
  const target = normalizeTarget(goal, startWeight, targetWeight);

  const delta = round1(Math.abs(startWeight - target));
  const aimLine =
    delta === 0
      ? 'Same as your start weight'
      : goal === 'lose'
        ? `${delta.toFixed(1)} kg to lose`
        : `${delta.toFixed(1)} kg to gain`;

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const onBack = useCallback(() => {
    if (index === 0) {
      if (isEdit) router.back();
      return;
    }
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, [index, isEdit, router]);

  // Choosing a goal nudges an inconsistent target onto the right side of the
  // start weight, so the live aim line always adds up. An already-consistent
  // target is left exactly as the user set it.
  const selectGoal = useCallback(
    (next: Goal) => {
      setGoal(next);
      setTargetWeight((current) => normalizeTarget(next, startWeight, current));
    },
    [startWeight],
  );

  const finish = useCallback(() => {
    if (trimmedName.length === 0) return;

    // Never persist an incoherent goal/target pair (see `normalizeTarget`).
    const safeTarget = normalizeTarget(goal, startWeight, targetWeight);

    if (isEdit) {
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: { name: trimmedName, startWeight, targetWeight: safeTarget, goal },
      });
      router.back();
      return;
    }

    dispatch({
      type: 'COMPLETE_ONBOARDING',
      profile: {
        name: trimmedName,
        unit: 'kg',
        startWeight,
        targetWeight: safeTarget,
        goal,
        createdAt: new Date().toISOString(),
      },
    });
    router.replace('/(tabs)');
  }, [dispatch, goal, isEdit, router, startWeight, targetWeight, trimmedName]);

  const onPrimary = useCallback(() => {
    if (step === 'summary') {
      finish();
      return;
    }
    goNext();
  }, [finish, goNext, step]);

  const ctaLabel =
    step === 'summary'
      ? isEdit
        ? 'Save changes'
        : "Let's go"
      : step === 'welcome'
        ? 'Get started'
        : 'Continue';

  const showHeader = step !== 'welcome';

  function renderStep() {
    switch (step) {
      case 'welcome':
        return (
          <View style={s.welcome}>
            <PlateMark size={132} />
            <Text style={s.wordmark} accessibilityRole="header">
              GymMate
            </Text>
            <Text style={s.promise}>
              Track your lifts, cardio and weight — one calm number at a time.
            </Text>
            <Text style={s.privacy}>No account, no cloud. Everything stays on this device.</Text>
          </View>
        );

      case 'name':
        return (
          <View style={s.step}>
            <Text style={s.stepTitle} accessibilityRole="header">
              What should I call you?
            </Text>
            <Text style={s.stepLead}>
              A first name is plenty. It only greets you on your Today screen.
            </Text>
            <OnboardingInput
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="Alex"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={canAdvance ? goNext : undefined}
              maxLength={24}
              style={s.gapTop}
            />
          </View>
        );

      case 'body':
        return (
          <View style={s.step}>
            <Text style={s.stepTitle} accessibilityRole="header">
              Your starting point
            </Text>
            <Text style={s.stepLead}>
              Everything in kilograms. Nudge the numbers — you can change them any time.
            </Text>
            <Card style={s.gapTop}>
              <NumberStepper
                label="Current weight"
                value={startWeight}
                onChange={setStartWeight}
                min={WEIGHT_MIN}
                max={WEIGHT_MAX}
                step={0.1}
                unit="kg"
              />
              <View style={s.cardDivider} />
              <NumberStepper
                label="Target weight"
                value={targetWeight}
                onChange={setTargetWeight}
                min={WEIGHT_MIN}
                max={WEIGHT_MAX}
                step={0.1}
                unit="kg"
              />
            </Card>
          </View>
        );

      case 'goal':
        return (
          <View style={s.step}>
            <Text style={s.stepTitle} accessibilityRole="header">
              What are you here for?
            </Text>
            <Text style={s.stepLead}>
              This sets the tone for your progress. You can switch later.
            </Text>
            <View style={s.goalList} accessibilityRole="radiogroup" accessibilityLabel="Your goal">
              <GoalCard
                goal="lose"
                selected={goal === 'lose'}
                onPress={() => selectGoal('lose')}
                title="Lose weight"
                caption="Trim down while keeping your strength"
              />
              <GoalCard
                goal="gain"
                selected={goal === 'gain'}
                onPress={() => selectGoal('gain')}
                title="Gain weight"
                caption="Add size on a steady, patient surplus"
              />
            </View>
            <View style={[s.aim, { borderColor: goalTint }, s.gapTop]}>
              <Text style={s.aimLabel}>You&apos;ll aim for</Text>
              <Text style={[s.aimValue, { color: goalTint }]}>{target.toFixed(1)} kg</Text>
              <Text style={s.aimSub}>{aimLine}</Text>
            </View>
          </View>
        );

      case 'summary':
        return (
          <View style={s.step}>
            <Text style={s.stepTitle} accessibilityRole="header">
              {isEdit ? 'Save your changes' : "You're all set"}
            </Text>
            <Text style={s.stepLead}>
              {isEdit ? 'Check it over, then save.' : 'Here is where you are starting from.'}
            </Text>
            <Card style={s.gapTop}>
              <RecapRow label="Name" value={trimmedName} />
              <RecapRow label="Start" value={`${startWeight.toFixed(1)} kg`} />
              <RecapRow label="Target" value={`${target.toFixed(1)} kg`} color={goalTint} />
              <RecapRow
                label="Goal"
                value={goal === 'lose' ? 'Lose weight' : 'Gain weight'}
                color={goalTint}
                last
              />
            </Card>
            {!isEdit ? (
              <Text style={s.closing}>Small steps, kept calm. Let&apos;s begin.</Text>
            ) : null}
          </View>
        );
    }
  }

  return (
    <View style={s.root}>
      <View pointerEvents="none" style={s.orbTop} />
      <View pointerEvents="none" style={s.orbBottom} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={s.flex} edges={['top', 'bottom']}>
          {showHeader ? (
            <View style={s.header}>
              <View style={s.headerRow}>
                {canGoBack ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    onPress={onBack}
                    style={({ pressed }) => [s.backBtn, pressed ? s.backBtnPressed : null]}>
                    <Icons.back color={T.ink} size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
                  </Pressable>
                ) : (
                  <View style={s.backBtn} />
                )}
                <Text style={s.stepCount}>
                  {index + 1} / {steps.length}
                </Text>
              </View>
              <OnboardingProgress count={steps.length} activeIndex={index} style={s.progress} />
            </View>
          ) : null}

          <ScrollView
            style={s.flex}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}>
            <Pressable accessible={false} style={s.pressWrap} onPress={Keyboard.dismiss}>
              <StepTransition
                key={step}
                direction={direction}
                style={step === 'welcome' ? s.flex : undefined}>
                {renderStep()}
              </StepTransition>
            </Pressable>
          </ScrollView>

          <View style={s.footer}>
            <PrimaryButton label={ctaLabel} onPress={onPrimary} disabled={!canAdvance} />
            {isEdit ? <GhostButton label="Cancel" onPress={() => router.back()} /> : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const root: ViewStyle = { flex: 1, backgroundColor: T.bg, overflow: 'hidden' };
const flex: ViewStyle = { flex: 1 };
const orbTop: ViewStyle = {
  position: 'absolute',
  top: -110,
  right: -90,
  width: 340,
  height: 340,
  borderRadius: 170,
  backgroundColor: T.accent,
  opacity: 0.06,
};
const orbBottom: ViewStyle = {
  position: 'absolute',
  bottom: -130,
  left: -100,
  width: 300,
  height: 300,
  borderRadius: 150,
  backgroundColor: T.goalGain,
  opacity: 0.05,
};
const header: ViewStyle = { paddingHorizontal: 20, paddingTop: 4, gap: 12 };
const headerRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
};
const backBtn: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
  alignItems: 'center',
  justifyContent: 'center',
};
const backBtnPressed: ViewStyle = { opacity: 0.7 };
const stepCount: TextStyle = {
  fontSize: 12,
  color: T.muted,
  letterSpacing: 0.4,
  fontFamily: T.fontMonoMedium,
};
const progress: ViewStyle = { marginBottom: 4 };
const scrollContent: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 24,
};
const pressWrap: ViewStyle = { flex: 1 };
const welcome: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  paddingVertical: 24,
};
const wordmark: TextStyle = { fontSize: 42, fontWeight: '800', color: T.ink, letterSpacing: -1.4 };
const promise: TextStyle = {
  fontSize: 16,
  color: T.label,
  textAlign: 'center',
  lineHeight: 24,
  maxWidth: 300,
};
const privacy: TextStyle = { fontSize: 12, color: T.muted, textAlign: 'center' };
const step: ViewStyle = { paddingTop: 4 };
const gapTop: ViewStyle = { marginTop: 18 };
const stepTitle: TextStyle = { fontSize: 30, fontWeight: '800', color: T.ink, letterSpacing: -0.7 };
const stepLead: TextStyle = { fontSize: 15, color: T.muted, lineHeight: 22, marginTop: 8 };
const cardDivider: ViewStyle = { height: 1, backgroundColor: T.line, marginVertical: 14 };
const goalList: ViewStyle = { gap: 12, marginTop: 18 };
const aim: ViewStyle = {
  borderWidth: 1,
  borderRadius: 20,
  padding: 18,
  backgroundColor: T.surface,
  gap: 2,
};
const aimLabel: TextStyle = { fontSize: 12, color: T.muted, letterSpacing: 0.3 };
const aimValue: TextStyle = { fontSize: 34, fontFamily: T.fontMonoBold, letterSpacing: -0.6 };
const aimSub: TextStyle = { fontSize: 13, color: T.muted, marginTop: 2 };
const closing: TextStyle = { fontSize: 13, color: T.muted, marginTop: 14 };
const footer: ViewStyle = { paddingHorizontal: 20, paddingTop: 12, gap: 10 };

const s = StyleSheet.create({
  root,
  flex,
  orbTop,
  orbBottom,
  header,
  headerRow,
  backBtn,
  backBtnPressed,
  stepCount,
  progress,
  scrollContent,
  pressWrap,
  welcome,
  wordmark,
  promise,
  privacy,
  step,
  gapTop,
  stepTitle,
  stepLead,
  cardDivider,
  goalList,
  aim,
  aimLabel,
  aimValue,
  aimSub,
  closing,
  footer,
});
