/**
 * One macro's intake bar — icon, gram value and a thin accent track.
 *
 * The bar stays accent-only on purpose: the ring already carries the profile's
 * goal colour, so three more tinted bars would read as three more goals. The
 * fill is clamped by `macroProgress`, so going over target shows a full bar
 * without overflowing its rounded track.
 */
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Icons, ICON_SIZE, ICON_STROKE, type IconName } from '@/components/gymmate/icons';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { formatGrams } from '@/lib/gymmate/format';
import { macroProgress } from '@/lib/gymmate/nutrition';

export interface MacroBarProps {
  label: string;
  /** Grams consumed. */
  value: number;
  target: number | null;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function MacroBar({ label, value, target, icon, style }: MacroBarProps) {
  // One guard for every use: a `0`, negative or non-finite target is "no target",
  // so the bar, the value and the label can never disagree about whether a goal exists.
  const hasTarget = typeof target === 'number' && Number.isFinite(target) && target > 0;
  const percent = Math.round(macroProgress(value, target) * 100);
  const targetLabel = hasTarget ? ` / ${formatGrams(target)}` : '';
  const Icon = icon ? Icons[icon] : null;

  return (
    <View
      accessible
      accessibilityRole={hasTarget ? 'progressbar' : 'text'}
      accessibilityLabel={`${label}: ${formatGrams(value)}${hasTarget ? ` of ${formatGrams(target)}` : ''}`}
      accessibilityValue={hasTarget ? { min: 0, max: 100, now: percent } : undefined}
      style={[s.row, style]}>
      <View style={s.head}>
        <View style={s.identity}>
          {Icon ? <Icon color={T.muted} size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} /> : null}
          <Text style={s.label} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <Text style={s.value} numberOfLines={1}>
          {formatGrams(value)}
          <Text style={s.target}>{targetLabel}</Text>
        </Text>
      </View>

      <View style={s.track}>
        <View style={[s.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const row: ViewStyle = { paddingVertical: 6, gap: 8 };
const head: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minHeight: 28,
};
const identity: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  flexShrink: 1,
};
const label: TextStyle = { fontSize: 13, color: T.label, fontFamily: T.fontMonoMedium };
const value: TextStyle = { fontSize: 13, color: T.ink, fontFamily: T.fontMonoBold, flexShrink: 0 };
const target: TextStyle = { fontFamily: T.fontMono, color: T.muted };
const track: ViewStyle = {
  height: 8,
  borderRadius: 999,
  backgroundColor: T.barTrack,
  overflow: 'hidden',
};
const fill: ViewStyle = { height: '100%', borderRadius: 999, backgroundColor: T.accent };

const s = StyleSheet.create({ row, head, identity, label, value, target, track, fill });
