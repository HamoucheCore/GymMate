/**
 * GymMate theme tokens — the single source of truth for colour and typography.
 *
 * Dark only. "Purple calm": deep charcoal backgrounds, one lavender accent,
 * muted ink. Never hardcode a hex value in a screen or component; import `T`
 * from '@/constants/GymMateTheme' instead.
 */
export const GymMateTheme = {
  /* Surfaces */
  bg: '#0D0C11',
  surface: '#15131C',
  surface2: '#1C1926',
  sheet: '#14121B',
  line: '#2A2638',
  scrim: 'rgba(0,0,0,0.6)',

  /* Text */
  ink: '#EDE9E6',
  muted: '#A29EAF',
  label: '#C6C2D6',

  /* Accent */
  accent: '#B3A1FF',
  accentInk: '#150F2A',

  /* Pills / plates / bars */
  pillBg: '#201C30',
  pillText: '#D6D1E8',
  plateBg: '#231F36',
  barTrack: '#28243A',
  checkBorder: '#3A3450',

  /* Semantic */
  danger: '#FF9D9D',
  dangerBorder: '#3A2630',
  success: '#9AD8BE',

  /* Goal accents (calm purple family, distinguishable from each other) */
  goalLose: '#8E7BF0',
  goalGain: '#C9A7F5',

  /* Typography — subset JetBrains Mono (numeric/data displays). Subset in the
     scratch project to ASCII + Latin + punctuation + symbols; the Nerd-Font
     icon/Powerline glyphs are gone (icons come from the `Icons` registry).
     Each weight is registered as its own family in app/_layout.tsx, so a
     style selects weight by family name and must NOT also set fontWeight. */
  fontMono: 'JetBrainsMono',
  fontMonoMedium: 'JetBrainsMono-Medium',
  fontMonoBold: 'JetBrainsMono-Bold',

  /* Metrics */
  radius: 20,
} as const;

export type GymMateTheme = typeof GymMateTheme;

/** Max content width for readability on tablets and desktop web. */
export const MAX_CONTENT_WIDTH = 640;
/** Max width for bottom sheets so they don't stretch edge-to-edge on large screens. */
export const SHEET_MAX_WIDTH = 640;
