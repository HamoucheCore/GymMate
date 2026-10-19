/**
 * ExerciseDetailSheet — everything the catalog knows about one lift.
 *
 * Opens from the Plan picker and from a planned lift's thumbnail. Same bottom
 * sheet language as the Today set logger: scrim, drag handle, safe-area
 * padding. Dismissed by the scrim, the handle, or the hardware back button.
 *
 * The Modal stays mounted once first opened so `visible` drives the slide-out
 * animation; the last non-null lift is retained through the closing frame.
 *
 * The catalog is no longer metadata-complete: `level`/`mechanic`/`category` and
 * the muscle arrays are often absent, so every optional section renders only
 * when its value exists.
 */
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icons, ICON_SIZE, ICON_STROKE } from '../icons';
import { MAX_MEDIA_PX } from './ExerciseVisual';
import { Pill } from '../Pill';
import { GymMateTheme as T, SHEET_MAX_WIDTH } from '@/constants/GymMateTheme';
import type { LibraryExercise } from '@/lib/gymmate/data';

export interface ExerciseDetailSheetProps {
  /** The lift to show. The sheet keeps the last one while it slides out. */
  exercise: LibraryExercise | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Hero media size. The bundled stills and animations are 180×180, so the hero
 * is capped at the native `MAX_MEDIA_PX` and never upscaled past it.
 */
const HERO_SIZE = Math.min(180, MAX_MEDIA_PX);
/** Cross-dissolve for the hero image, matching `ExerciseVisual`. */
const TRANSITION_MS = 220;

/** 'middle back' -> 'Middle back'; the dataset keys are lowercase. */
function humanizeMuscle(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function muscleList(muscles: readonly string[]): string {
  return muscles
    .map(humanizeMuscle)
    .filter((label) => label.length > 0)
    .join(', ');
}

interface MuscleRowProps {
  label: string;
  value: string;
}

function MuscleRow({ label, value }: MuscleRowProps) {
  return (
    <View style={s.muscleRow}>
      <Text style={s.muscleLabel}>{label}</Text>
      <Text style={s.muscleValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function InstructionStep({ index, text }: { index: number; text: string }) {
  return (
    <View style={s.step}>
      <View style={s.stepIndex}>
        <Text style={s.stepIndexText}>{index}</Text>
      </View>
      <Text style={s.stepText}>{text}</Text>
    </View>
  );
}

export function ExerciseDetailSheet({
  exercise,
  visible,
  onClose,
}: ExerciseDetailSheetProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  // Retain the last non-null lift so the sheet still has content while it
  // animates closed after the caller clears `exercise`. The retained value is
  // written in an effect (never during render) and read only as a fallback.
  const [retained, setRetained] = useState<LibraryExercise | null>(null);
  useEffect(() => {
    if (exercise) setRetained(exercise);
  }, [exercise]);
  const shown = exercise ?? retained;

  const primary = shown ? muscleList(shown.primaryMuscles) : '';
  const secondary = shown ? muscleList(shown.secondaryMuscles) : '';
  const media = shown ? shown.gifUrl ?? shown.imageUrl : null;
  const dismissLabel = shown ? `Close ${shown.name} details` : 'Close exercise details';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          accessibilityHint="Returns to the exercise list"
          onPress={onClose}
          style={s.scrim}
        />

        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            onPress={onClose}
            style={s.handleRow}>
            <View style={s.handle} />
          </Pressable>

          {shown ? (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}>
              <View style={s.hero}>
                <View style={s.heroFrame}>
                  {media ? (
                    <Image
                      source={media}
                      contentFit="cover"
                      transition={TRANSITION_MS}
                      cachePolicy="memory-disk"
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <View style={s.heroPlaceholder}>
                      <Icons.exercise color={T.muted} size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
                    </View>
                  )}
                </View>
              </View>

              <Text style={s.name} accessibilityRole="header">
                {shown.name}
              </Text>

              <View style={s.pills}>
                {shown.muscle ? <Pill label={shown.muscle} tone="accent" /> : null}
                {shown.equipment.length > 0 ? <Pill label={shown.equipment} /> : null}
                {shown.level ? <Pill label={shown.level} tone="muted" /> : null}
                {shown.mechanic ? <Pill label={shown.mechanic} tone="muted" /> : null}
              </View>

              {primary.length > 0 || secondary.length > 0 ? (
                <View style={s.muscles}>
                  {primary.length > 0 ? <MuscleRow label="Primary" value={primary} /> : null}
                  {secondary.length > 0 ? (
                    <MuscleRow label="Assisting" value={secondary} />
                  ) : null}
                </View>
              ) : null}

              {shown.instructions.length > 0 ? (
                <>
                  <Text style={s.section}>How to do it</Text>
                  {shown.instructions.map((instruction, index) => (
                    <InstructionStep key={index} index={index + 1} text={instruction} />
                  ))}
                </>
              ) : (
                <Text style={s.empty}>
                  No step-by-step notes for this lift yet. Set up carefully, keep the load honest,
                  and stop the set while form still holds.
                </Text>
              )}

              <Text style={s.credit}>© Gym visual — https://gymvisual.com/</Text>
            </ScrollView>
          ) : null}
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
  paddingTop: 6,
  maxHeight: '92%',
  width: '100%',
  maxWidth: SHEET_MAX_WIDTH,
  alignSelf: 'center',
};
const handleRow: ViewStyle = {
  minHeight: 44,
  alignItems: 'center',
  justifyContent: 'center',
};
const handle: ViewStyle = { width: 44, height: 4, borderRadius: 2, backgroundColor: T.line };

const scroll: ViewStyle = { flexShrink: 1 };
const scrollContent: ViewStyle = { paddingBottom: 4 };

const hero: ViewStyle = { alignItems: 'center', marginBottom: 14 };
const heroFrame: ViewStyle = {
  width: HERO_SIZE,
  height: HERO_SIZE,
  borderRadius: 26,
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  overflow: 'hidden',
};
const heroPlaceholder: ViewStyle = { flex: 1, alignItems: 'center', justifyContent: 'center' };

const name: TextStyle = { fontSize: 21, fontWeight: '800', color: T.ink, letterSpacing: -0.4 };
const pills: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 };

const muscles: ViewStyle = {
  marginTop: 16,
  borderTopWidth: 1,
  borderTopColor: T.line,
  paddingTop: 12,
  gap: 8,
};
const muscleRow: ViewStyle = { flexDirection: 'row', alignItems: 'flex-start', gap: 12 };
const muscleLabel: TextStyle = {
  width: 76,
  fontSize: 12,
  fontFamily: T.fontMonoMedium,
  color: T.muted,
};
const muscleValue: TextStyle = { flex: 1, fontSize: 13, fontWeight: '600', color: T.accent };

const section: TextStyle = {
  marginTop: 20,
  marginBottom: 10,
  fontSize: 13,
  fontWeight: '700',
  color: T.label,
};

const step: ViewStyle = { flexDirection: 'row', gap: 10, marginBottom: 10 };
const stepIndex: ViewStyle = {
  width: 22,
  height: 22,
  borderRadius: 11,
  backgroundColor: T.pillBg,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 1,
};
const stepIndexText: TextStyle = { fontSize: 11, fontFamily: T.fontMonoBold, color: T.accent };
const stepText: TextStyle = { flex: 1, fontSize: 14, lineHeight: 21, color: T.label };

const empty: TextStyle = { fontSize: 13, lineHeight: 20, color: T.muted };

const credit: TextStyle = {
  marginTop: 20,
  fontSize: 11,
  color: T.muted,
  textAlign: 'center',
};

const s = StyleSheet.create({
  root,
  scrim,
  sheet,
  handleRow,
  handle,
  scroll,
  scrollContent,
  hero,
  heroFrame,
  heroPlaceholder,
  name,
  pills,
  muscles,
  muscleRow,
  muscleLabel,
  muscleValue,
  section,
  step,
  stepIndex,
  stepIndexText,
  stepText,
  empty,
  credit,
});
