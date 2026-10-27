/**
 * Bottom sheet for logging one meal.
 *
 * Follows the `today/WorkoutSheet` modal conventions exactly (scrim, bottom
 * sheet, `SHEET_MAX_WIDTH`) so the two forms feel like one interaction. The
 * form owns only ephemeral strings: it resets on every open and hands a
 * validated `MealDraft` to `onSubmit`, so no stale draft can leak between days.
 *
 * Numbers are parsed only on submit, comma-tolerantly — a phone keyboard in a
 * comma-decimal locale must not silently reject a real value.
 */
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostButton } from '@/components/gymmate/GhostButton';
import { PrimaryButton } from '@/components/gymmate/PrimaryButton';
import { GymMateTheme as T, SHEET_MAX_WIDTH } from '@/constants/GymMateTheme';
import { MEAL_LIMITS, MEAL_NAME_MAX, MEAL_SLOTS, type MealSlot } from '@/lib/gymmate/nutrition';

export interface MealDraft {
  name: string;
  slot: MealSlot;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AddMealSheetProps {
  visible: boolean;
  /** Human label for the day the meal lands on, e.g. 'Today'. */
  dateLabel: string;
  onClose: () => void;
  onSubmit: (draft: MealDraft) => void;
}

/** Breakfast before 11:00, lunch before 15:00, dinner before 20:00, else snack. */
function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

function parseDecimal(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

/** Blank means "not known" and counts as 0; anything unparseable/out of range is an error. */
function parseMacro(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized.length === 0) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < MEAL_LIMITS.macros.min || parsed > MEAL_LIMITS.macros.max) return null;
  return parsed;
}

function macroRangeError(label: string): string {
  return `${label} must be between ${MEAL_LIMITS.macros.min} and ${MEAL_LIMITS.macros.max} g.`;
}

const CALORIE_RANGE_ERROR = `Calories must be between ${MEAL_LIMITS.calories.min} and ${MEAL_LIMITS.calories.max} kcal.`;

interface MealFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

function MealField({ label, value, onChangeText }: MealFieldProps) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={T.muted}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={s.input}
      />
    </View>
  );
}

export function AddMealSheet({ visible, dateLabel, onClose, onSubmit }: AddMealSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<MealSlot>('breakfast');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setCalories('');
    setProtein('0');
    setCarbs('0');
    setFat('0');
    setSlot(slotForHour(new Date().getHours()));
    setError(null);
  }, [visible]);

  function update(setter: (next: string) => void, text: string) {
    setter(text);
    if (error !== null) setError(null);
  }

  function selectSlot(next: MealSlot) {
    setSlot(next);
    if (error !== null) setError(null);
  }

  function submit() {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Give the meal a name.');
      return;
    }

    const rawCalories = calories.trim();
    if (rawCalories.length === 0) {
      setError('Enter the calories for this meal.');
      return;
    }
    const kcal = parseDecimal(rawCalories);
    if (
      !Number.isFinite(kcal) ||
      kcal < MEAL_LIMITS.calories.min ||
      kcal > MEAL_LIMITS.calories.max
    ) {
      setError(CALORIE_RANGE_ERROR);
      return;
    }

    const proteinValue = parseMacro(protein);
    if (proteinValue === null) {
      setError(macroRangeError('Protein'));
      return;
    }
    const carbsValue = parseMacro(carbs);
    if (carbsValue === null) {
      setError(macroRangeError('Carbs'));
      return;
    }
    const fatValue = parseMacro(fat);
    if (fatValue === null) {
      setError(macroRangeError('Fat'));
      return;
    }

    setError(null);
    onSubmit({
      name: trimmedName,
      slot,
      calories: kcal,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
    });
    // Clear the draft straight away: the `visible` effect only runs on the next
    // open, so leaving the strings here would flash this meal for a frame.
    setName('');
    setCalories('');
    setProtein('0');
    setCarbs('0');
    setFat('0');
    setError(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close the meal form"
          onPress={onClose}
          style={s.scrim}
        />

        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={s.head}>
            <View style={s.headText}>
              <Text style={s.title} accessibilityRole="header">
                Log a meal
              </Text>
              <Text style={s.subtitle} numberOfLines={1}>
                Adding to {dateLabel}
              </Text>
            </View>
            <GhostButton label="Close" fullWidth={false} onPress={onClose} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.body}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              style={s.scroll}
              contentContainerStyle={s.scrollContent}>
              <View style={s.block}>
                <Text style={s.fieldLabel} numberOfLines={1}>
                  Meal name
                </Text>
                <TextInput
                  accessibilityLabel="Meal name"
                  value={name}
                  onChangeText={(text) => update(setName, text)}
                  placeholder="Chicken rice bowl"
                  placeholderTextColor={T.muted}
                  maxLength={MEAL_NAME_MAX}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={s.input}
                />
              </View>

              <View style={s.block}>
                <Text style={s.fieldLabel}>Meal</Text>
                <View style={s.chips} accessibilityRole="tablist">
                  {MEAL_SLOTS.map((option) => {
                    const selected = option.key === slot;
                    return (
                      <Pressable
                        key={option.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        onPress={() => selectSlot(option.key)}
                        style={({ pressed }) => [
                          s.chip,
                          selected ? s.chipActive : null,
                          pressed && !selected ? s.chipPressed : null,
                        ]}>
                        <Text
                          style={[s.chipText, selected ? s.chipTextActive : null]}
                          numberOfLines={1}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={s.grid}>
                <MealField
                  label="Calories (kcal)"
                  value={calories}
                  onChangeText={(text) => update(setCalories, text)}
                />
                <MealField
                  label="Protein (g)"
                  value={protein}
                  onChangeText={(text) => update(setProtein, text)}
                />
                <MealField
                  label="Carbs (g)"
                  value={carbs}
                  onChangeText={(text) => update(setCarbs, text)}
                />
                <MealField
                  label="Fat (g)"
                  value={fat}
                  onChangeText={(text) => update(setFat, text)}
                />
              </View>

              {error !== null ? (
                <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>
                  {error}
                </Text>
              ) : null}

              <PrimaryButton label="Add meal" onPress={submit} style={s.submit} />
              <Text style={s.note}>Macros are optional — enter what you know.</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const root: ViewStyle = { flex: 1, justifyContent: 'flex-end' };
const scrim: ViewStyle = { flex: 1, backgroundColor: T.scrim };
const sheet: ViewStyle = {
  backgroundColor: T.sheet,
  borderColor: T.line,
  borderWidth: 1,
  borderBottomWidth: 0,
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  paddingHorizontal: 18,
  paddingTop: 18,
  maxHeight: '92%',
  width: '100%',
  maxWidth: SHEET_MAX_WIDTH,
  alignSelf: 'center',
};
const head: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 };
const headText: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const title: TextStyle = { fontSize: 18, fontWeight: '800', color: T.ink, letterSpacing: -0.3 };
const subtitle: TextStyle = { fontSize: 12, color: T.muted, fontFamily: T.fontMono };

const body: ViewStyle = { flexShrink: 1 };
const scroll: ViewStyle = { flexShrink: 1 };
const scrollContent: ViewStyle = { paddingBottom: 4 };

const block: ViewStyle = { gap: 6, marginBottom: 16 };
const field: ViewStyle = { flexGrow: 1, flexBasis: '46%', minWidth: 120, gap: 6 };
const fieldLabel: TextStyle = { fontSize: 12, color: T.muted, letterSpacing: 0.3 };
const input: TextStyle = {
  minHeight: 48,
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: T.ink,
  fontSize: 15,
  fontFamily: T.fontMono,
};

const chips: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };
const chip: ViewStyle = {
  minHeight: 44,
  paddingHorizontal: 16,
  borderRadius: 999,
  backgroundColor: T.pillBg,
  alignItems: 'center',
  justifyContent: 'center',
};
const chipActive: ViewStyle = { backgroundColor: T.accent };
const chipPressed: ViewStyle = { opacity: 0.75 };
const chipText: TextStyle = { fontSize: 13, color: T.pillText, fontFamily: T.fontMonoMedium };
const chipTextActive: TextStyle = { color: T.accentInk, fontFamily: T.fontMonoBold };

const grid: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 14,
};

const error: TextStyle = { fontSize: 12, color: T.danger, lineHeight: 17, marginBottom: 10 };
const submit: ViewStyle = { marginTop: 2 };
const note: TextStyle = { fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 10 };

const s = StyleSheet.create({
  root,
  scrim,
  sheet,
  head,
  headText,
  title,
  subtitle,
  body,
  scroll,
  scrollContent,
  block,
  field,
  fieldLabel,
  input,
  chips,
  chip,
  chipActive,
  chipPressed,
  chipText,
  chipTextActive,
  grid,
  error,
  submit,
  note,
});
