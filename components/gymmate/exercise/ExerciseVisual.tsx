/**
 * ExerciseVisual — the one place in the app that decides how a lift is drawn.
 *
 * Always the real bundled artwork: every catalog entry carries a local 180×180
 * `imageUrl` (© Gym visual — https://gymvisual.com/) and featured lifts also
 * carry an animated `gifUrl`. There is no vector fallback; when a source is
 * somehow missing we render a neutral themed plate instead of a broken image.
 */
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icons, ICON_SIZE, ICON_STROKE } from '../icons';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import type { LibraryExercise } from '@/lib/gymmate/data';

export interface ExerciseVisualProps {
  exercise: LibraryExercise;
  /** Side length of the square, in points. */
  size?: number;
  /** Corner radius. Defaults to `size * 0.28`. */
  rounded?: number;
  /** Hide the visual from assistive tech when the row already names the lift. */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Cross-dissolve, so a late-arriving photo does not pop. */
const TRANSITION_MS = 220;

/**
 * Native resolution of every bundled still and animation. Callers may request
 * any `size`, but the frame is clamped here so the 180×180 media is never
 * upscaled (the licence requires it stay at or below 180×180).
 */
export const MAX_MEDIA_PX = 180;

export function ExerciseVisual({
  exercise,
  size = 56,
  rounded,
  decorative = false,
  style,
}: ExerciseVisualProps): React.ReactElement {
  const side = Math.min(size, MAX_MEDIA_PX);
  const radius = rounded ?? side * 0.28;
  const source = exercise.imageUrl;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : `${exercise.name} demonstration`}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[styles.frame, { width: side, height: side, borderRadius: radius }, style]}>
      {source ? (
        <Image
          source={source}
          contentFit="cover"
          transition={TRANSITION_MS}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.placeholder}>
          <Icons.exercise
            color={T.muted}
            size={side >= 40 ? ICON_SIZE.lg : ICON_SIZE.sm}
            strokeWidth={ICON_STROKE}
          />
        </View>
      )}
    </View>
  );
}

const frame: ViewStyle = {
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  overflow: 'hidden',
};
const placeholder: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
};

const styles = StyleSheet.create({ frame, placeholder });
