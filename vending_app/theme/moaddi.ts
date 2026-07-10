/**
 * Moaddi design tokens — the single source of truth for the redesign.
 *
 * Ported from the Claude Design "moaddi-design-system" CSS token files
 * (tokens/colors.css, typography.css, spacing.css, effects.css) into
 * React-Native-friendly constants. Primitives in `components/moaddi/*`
 * consume these directly; screen layout can also use the mirrored Tailwind
 * palette (see tailwind.config.js → theme.extend.colors.moaddi).
 *
 * Accent default: Teal (logo teal). Gold is available as an alt accent.
 */

/* ---- Brand + neutral palette ---- */
export const palette = {
  teal: {
    50: "#e9f8fa",
    100: "#cdeff4",
    200: "#9fe1ea",
    300: "#63cddd",
    400: "#2cb4cc", // brand primary — logo teal
    500: "#1e9db4",
    600: "#17808f",
    700: "#136675",
    800: "#114f5c",
    900: "#0d3a44",
  },
  periwinkle: {
    100: "#e4e9fb",
    300: "#a5b3ef",
    400: "#7287e2", // secondary — gradient partner
    600: "#4c5fc0",
  },
  gold: {
    100: "#f9f0d8",
    300: "#ecd28f",
    400: "#e0bd5f", // accent — logo gold
    600: "#b6923a",
  },
  ink: {
    950: "#09090b",
    900: "#18181b",
    700: "#3f3f46",
    500: "#71717a",
    400: "#a1a1aa",
    300: "#d4d4d8",
    200: "#e4e4e7",
    100: "#f4f4f5",
    50: "#fafafa",
  },
  white: "#ffffff",
} as const;

/* ---- Semantic status ---- */
export const status = {
  success: "#16a34a",
  successBg: "#e8f7ee",
  warning: "#d97706",
  warningBg: "#fdf3e3",
  danger: "#99001a",
  dangerBg: "#fbe9ec",
  info: "#0077cc",
  infoBg: "#e6f2fb",
} as const;

/* ---- Semantic aliases (teal accent) ---- */
export const colors = {
  surfacePage: palette.ink[50],
  surfaceCard: palette.white,
  surfaceSunken: palette.ink[100],
  surfaceBrand: palette.teal[400],
  surfaceBrandSoft: palette.teal[50],
  surfaceInverse: palette.ink[950],

  textHeading: palette.ink[950],
  textBody: palette.ink[700],
  textMuted: palette.ink[500],
  textOnBrand: palette.white,
  textBrand: palette.teal[500],
  textPrice: palette.ink[950],

  borderDefault: palette.ink[200],
  borderStrong: palette.ink[300],
  borderBrand: palette.teal[400],

  interactivePrimary: palette.teal[400],
  interactivePrimaryPress: palette.teal[500],
  interactiveRing: palette.teal[300],

  ...status,
} as const;

/* Gradient pairs (for expo-linear-gradient) */
export const gradients = {
  brandHero: [palette.teal[400], palette.teal[500]] as const,
  brandRing: [palette.teal[400], palette.periwinkle[400]] as const,
};

/* ---- Spacing (4px grid) + screen chrome ---- */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  gutter: 20, // horizontal page padding
  section: 24, // between content sections
  card: 12, // between sibling cards
  cardPad: 16, // inner card padding
} as const;

export const sizes = {
  hitMin: 44,
  controlH: 48,
  controlHSm: 36,
  bottomNavH: 64,
} as const;

/* ---- Corner radii ---- */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/* ---- Typography ----
 * One family serves Latin + Arabic. Falls back to system until the
 * IBM Plex Sans Arabic font files are loaded (follow-up).
 */
export const fontFamily: string | undefined = undefined; // system default for now

type TypeStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight:
    | "400"
    | "600"
    | "700";
};

export const type = {
  display: { fontSize: 28, lineHeight: 33.6, fontWeight: "700" },
  title1: { fontSize: 22, lineHeight: 27.5, fontWeight: "700" },
  title2: { fontSize: 18, lineHeight: 23.4, fontWeight: "600" },
  title3: { fontSize: 16, lineHeight: 21.6, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22.5, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22.5, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18.2, fontWeight: "400" },
  label: { fontSize: 12, lineHeight: 15.6, fontWeight: "600" },
  price: { fontSize: 17, lineHeight: 22.1, fontWeight: "700" },
} satisfies Record<string, TypeStyle>;

export const trackingLabel = 0.24; // ~0.02em @ 12px, in px for RN letterSpacing

/* ---- Shadows (RN elevation + iOS shadow) ---- */
export const shadow = {
  card: {
    shadowColor: palette.teal[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: palette.teal[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  // Flat bottom bar: hairline separation only, NOT a raised/elevated bar.
  // (Android elevation kept at 0 so the tab bar sits flush like the design.)
  nav: {
    shadowColor: palette.teal[900],
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 0,
  },
} as const;

export const moaddi = {
  palette,
  colors,
  gradients,
  space,
  sizes,
  radius,
  type,
  shadow,
  fontFamily,
  trackingLabel,
};

export default moaddi;
