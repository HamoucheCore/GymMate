import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';

export interface PlateMarkProps {
  /** Outer diameter in points. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A weight plate drawn from three concentric bevels — the flow's single
 * decorative motif, borrowed from the object the app is about rather than a
 * generic glyph. Pure tokens, no imagery, no icon font.
 */
export function PlateMark({ size = 128, style }: PlateMarkProps) {
  const bevel = size * 0.82;
  const ring = size * 0.62;
  const hole = size * 0.26;

  const centered = (d: number): ViewStyle => ({ top: (size - d) / 2, left: (size - d) / 2 });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.disc, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <View
        style={[
          s.layer,
          s.bevel,
          { width: bevel, height: bevel, borderRadius: bevel / 2 },
          centered(bevel),
        ]}
      />
      <View
        style={[
          s.layer,
          s.ring,
          { width: ring, height: ring, borderRadius: ring / 2 },
          centered(ring),
        ]}
      />
      <View
        style={[
          s.layer,
          s.hole,
          { width: hole, height: hole, borderRadius: hole / 2 },
          centered(hole),
        ]}
      />
    </View>
  );
}

const disc: ViewStyle = {
  backgroundColor: T.surface,
  borderColor: T.line,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
};
const layer: ViewStyle = { position: 'absolute' };
const bevel: ViewStyle = { borderColor: T.accent, borderWidth: 1, opacity: 0.28 };
const ring: ViewStyle = { borderColor: T.accent, borderWidth: 2 };
const hole: ViewStyle = { backgroundColor: T.bg, borderColor: T.line, borderWidth: 1 };

const s = StyleSheet.create({ disc, layer, bevel, ring, hole });
