import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { GymMateTheme as T } from '@/constants/GymMateTheme';
import { Card, ExerciseVisual, Pill } from '@/components/gymmate';
import {
  LIBRARY,
  MUSCLES,
  libraryByMuscle,
  searchLibrary,
  type LibraryExercise,
  type Muscle,
} from '@/lib/gymmate/data';
import { useDebounce } from '@/hooks/useDebounce';
import { joinParts, plural } from '@/lib/gymmate/format';

export interface ExercisePickerProps {
  /** Names already planned for the day, so they can be marked. */
  addedNames: string[];
  /** Defaults applied on add — shown to assistive tech so the result is known. */
  defaultSets: number;
  defaultReps: number;
  onAdd: (exercise: LibraryExercise) => void;
  /** Opens the detail sheet for a lift without adding it to the day. */
  onPreview?: (exercise: LibraryExercise) => void;
  style?: StyleProp<ViewStyle>;
}

const ALL_MUSCLES = 'All';
type MuscleFilter = typeof ALL_MUSCLES | Muscle;
const FILTERS: MuscleFilter[] = [ALL_MUSCLES, ...MUSCLES];

/**
 * How many rows mount per "Show more" tap. The picker renders inside the Plan
 * screen's ScrollView, so a nested VirtualizedList is not an option — instead
 * the list grows a page at a time and the counter resets whenever the filter set
 * changes.
 */
const PAGE_SIZE = 20;

/**
 * Automatic ceiling for the default `All` browse (no muscle filter, no search).
 * Every row mounts an `ExerciseVisual` and this list lives in a plain ScrollView
 * (a nested VirtualizedList is not an option), so an untargeted browse stops
 * here and points at the muscle chips / search box rather than mounting all
 * 1,324 rows at once.
 *
 * Filtered and searched views are NOT capped: they are deliberate, and the
 * largest single group is Arms (263 of 1,324) — well past this ceiling — so the
 * user reaches the rest a page at a time via "Show more".
 */
const ALL_VIEW_CAP = 60;

/**
 * A real library browser over the catalog. Picking a muscle shows that group
 * immediately and the search box narrows within it. Every row carries a figure
 * thumbnail; tapping the row adds the lift to the day, tapping the thumbnail
 * opens its detail sheet instead.
 */
export function ExercisePicker({
  addedNames,
  defaultSets,
  defaultReps,
  onAdd,
  onPreview,
  style,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>(ALL_MUSCLES);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debouncedQuery = useDebounce(query, 200);

  const results = useMemo(() => {
    const source = filter === ALL_MUSCLES ? LIBRARY : libraryByMuscle(filter);
    const matched = searchLibrary(debouncedQuery, source);
    // Featured lifts lead (Array#sort is stable, so ties keep catalog order):
    // they are the curated, animated subset and the most likely picks.
    return [...matched].sort(
      (a, b) => Number(b.featured === true) - Number(a.featured === true),
    );
  }, [debouncedQuery, filter]);

  // A new search or muscle group is a new list: start it back at one page.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, filter]);

  const searching = debouncedQuery.trim().length > 0;
  const browsingAll = filter === ALL_MUSCLES && !searching;
  // The untargeted `All` browse is capped; every narrowed view can page through
  // its whole result set.
  const cap = browsingAll ? ALL_VIEW_CAP : Number.POSITIVE_INFINITY;
  const visible = results.slice(0, Math.min(visibleCount, cap));
  const remaining = results.length - visible.length;
  const capped = browsingAll && remaining > 0;

  const addedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of addedNames) counts.set(name, (counts.get(name) ?? 0) + 1);
    return counts;
  }, [addedNames]);

  const countLabel = `${results.length} ${plural(results.length, 'exercise', 'exercises')}`;
  const filterLabel = filter === ALL_MUSCLES ? 'the library' : filter.toLowerCase();

  return (
    <Card style={style}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search bench, back, cable…"
        placeholderTextColor={T.muted}
        selectionColor={T.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search the exercise library"
        style={s.search}
      />

      <View style={s.filters}>
        {FILTERS.map((option) => {
          const selected = option === filter;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option === ALL_MUSCLES ? 'Every muscle' : `Filter by ${option}`}
              onPress={() => setFilter(option)}
              style={({ pressed }) => [
                s.chip,
                selected ? s.chipOn : null,
                pressed && !selected ? s.chipPressed : null,
              ]}>
              <Text style={[s.chipText, selected ? s.chipTextOn : null]} numberOfLines={1}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.results}>
        <Text style={s.meta}>
          {results.length === 0
            ? 'No lifts match that.'
            : searching
              ? `${countLabel} matching “${debouncedQuery.trim()}”`
              : `${countLabel} in ${filterLabel}`}
        </Text>

        {results.length === 0 ? (
          <Text style={s.hint}>
            Try a lift name like bench, a muscle like back, or widen the muscle filter above.
          </Text>
        ) : (
          <>
            {visible.map((exercise, index) => {
              const planned = addedCounts.get(exercise.name) ?? 0;
              return (
                <View key={exercise.id} style={[s.result, index > 0 ? s.resultDivider : null]}>
                  {/* Siblings, not nested: a plain container holds the preview
                      control next to the add control, so each gets its own a11y
                      node on iOS instead of collapsing into the row. */}
                  {onPreview ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${exercise.name}`}
                      accessibilityHint="Opens the exercise details without adding it"
                      onPress={() => onPreview(exercise)}
                      style={({ pressed }) => [s.thumb, pressed ? s.thumbPressed : null]}>
                      <ExerciseVisual
                        exercise={exercise}
                        size={48}
                        rounded={14}
                        decorative
                        style={s.thumbFigure}
                      />
                    </Pressable>
                  ) : (
                    <View style={s.thumb}>
                      <ExerciseVisual
                        exercise={exercise}
                        size={48}
                        rounded={14}
                        decorative
                        style={s.thumbFigure}
                      />
                    </View>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${planned > 0 ? 'Add another' : 'Add'} ${
                      exercise.name
                    }${exercise.featured ? ', featured lift' : ''}`}
                    accessibilityHint={`Adds it to this day at ${defaultSets} sets of ${defaultReps}, ready to adjust`}
                    onPress={() => onAdd(exercise)}
                    style={({ pressed }) => [s.resultBody, pressed ? s.resultPressed : null]}>
                    <View style={s.resultText}>
                      <View style={s.nameRow}>
                        <Text style={s.resultName} numberOfLines={2}>
                          {exercise.name}
                        </Text>
                        {exercise.featured ? (
                          <Pill label="Featured" tone="accent" style={s.featuredPill} />
                        ) : null}
                      </View>
                      <Text style={s.resultDetail} numberOfLines={1}>
                        {joinParts([exercise.muscle, exercise.equipment])}
                      </Text>
                    </View>

                    {planned > 0 ? (
                      <Pill
                        label={planned === 1 ? 'In day' : `In day ${planned}×`}
                        tone="muted"
                        style={s.addedPill}
                      />
                    ) : (
                      <Text style={s.add}>Add</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}

            {remaining > 0 && visible.length < cap ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Show more exercises, ${remaining} remaining`}
                accessibilityHint="Loads the next page of the library"
                onPress={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, cap))}
                style={({ pressed }) => [s.more, pressed ? s.morePressed : null]}>
                <Text style={s.moreText}>Show more · {remaining} left</Text>
              </Pressable>
            ) : null}

            {visible.length > PAGE_SIZE ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show fewer exercises"
                accessibilityHint="Collapses the list back to the first page"
                onPress={() => setVisibleCount(PAGE_SIZE)}
                style={({ pressed }) => [s.more, pressed ? s.morePressed : null]}>
                <Text style={s.moreText}>Show less</Text>
              </Pressable>
            ) : null}

            {capped ? (
              <Text style={s.hint}>
                Showing the first {ALL_VIEW_CAP} of {results.length}. Pick a muscle or search to
                reach the rest.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}

const search: TextStyle = {
  backgroundColor: T.surface2,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 48,
  color: T.ink,
  fontSize: 15,
};
const filters: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 };
const chip: ViewStyle = {
  minHeight: 44,
  justifyContent: 'center',
  paddingHorizontal: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
};
const chipOn: ViewStyle = { backgroundColor: T.accent, borderColor: T.accent };
const chipPressed: ViewStyle = { backgroundColor: T.pillBg };
const chipText: TextStyle = { fontSize: 13, fontWeight: '600', color: T.pillText };
const chipTextOn: TextStyle = { color: T.accentInk, fontWeight: '700' };
const results: ViewStyle = { marginTop: 14 };
const meta: TextStyle = { fontSize: 12, color: T.muted, marginBottom: 2 };
const hint: TextStyle = { fontSize: 13, color: T.muted, lineHeight: 19, marginTop: 4 };
const result: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 12,
  minHeight: 64,
};
const resultDivider: ViewStyle = { borderTopWidth: 1, borderTopColor: T.line };
const resultPressed: ViewStyle = { backgroundColor: T.surface2 };
const thumb: ViewStyle = {
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
};
const thumbPressed: ViewStyle = { opacity: 0.7 };
const thumbFigure: ViewStyle = { borderRadius: 14 };
// The add control fills the rest of the row so the whole row still adds the
// lift; 44pt minimum keeps it a comfortable target on its own.
const resultBody: ViewStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderRadius: 12,
};
const resultText: ViewStyle = { flex: 1, minWidth: 0, gap: 2 };
const nameRow: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 };
const resultName: TextStyle = { flexShrink: 1, fontSize: 14, fontWeight: '700', color: T.ink };
const resultDetail: TextStyle = { fontSize: 12, color: T.muted };
const featuredPill: ViewStyle = { paddingVertical: 3, paddingHorizontal: 9 };
const add: TextStyle = { fontSize: 13, fontWeight: '700', color: T.accent };
const addedPill: ViewStyle = { alignSelf: 'center' };
const more: ViewStyle = {
  minHeight: 44,
  marginTop: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  borderWidth: 1,
  borderColor: T.line,
  backgroundColor: T.surface2,
};
const morePressed: ViewStyle = { backgroundColor: T.pillBg };
const moreText: TextStyle = { fontSize: 13, fontWeight: '700', color: T.accent };

const s = StyleSheet.create({
  search,
  filters,
  chip,
  chipOn,
  chipPressed,
  chipText,
  chipTextOn,
  results,
  meta,
  hint,
  result,
  resultDivider,
  resultPressed,
  thumb,
  thumbPressed,
  thumbFigure,
  resultBody,
  resultText,
  nameRow,
  resultName,
  resultDetail,
  featuredPill,
  add,
  addedPill,
  more,
  morePressed,
  moreText,
});
