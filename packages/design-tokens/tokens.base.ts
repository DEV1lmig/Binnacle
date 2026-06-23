/**
 * Shared design tokens (platform agnostic).
 * Imported by both `tokens.ts` (web) and `tokens.native.ts` (React Native).
 */

// ---------------------------------------------------------------------------
// Palette (HUD aesthetic — canonical)
// ---------------------------------------------------------------------------

export const colors = {
  bg: "#0B0E14",
  bgAlt: "#111620",
  surface: "#161B26",
  border: "#1E2636",
  borderLight: "#2A3448",

  text: "#E2E8F0",
  textMuted: "#8494A7",
  textDim: "#4A5568",

  // "Gold" in the codebase is the blue accent.
  gold: "#60A5FA",
  goldDim: "#3B82F6",
  bloom: "rgba(96, 165, 250, 0.08)",

  cyan: "#22D3EE",
  cyanDim: "#06B6D4",

  accent: "#A78BFA",
  accentDim: "#7C3AED",

  green: "#34D399",
  amber: "#FBBF24",
  red: "#EF4444",
} as const;

/**
 * Alias kept for existing consumers that import `C` inline styles.
 * Prefer `colors` for new code.
 */
export const C = colors;

// ---------------------------------------------------------------------------
// Game backlog status colors
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  playing: colors.green,
  completed: colors.amber,
  backlog: colors.gold,
  onhold: colors.amber,
  dropped: colors.red,
} as const;

// ---------------------------------------------------------------------------
// Spacing (numeric, used by mobile StyleSheet / dynamic layouts)
// Tailwind scale is 4px-based, so these align with p-1, p-2, p-4, etc.
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ---------------------------------------------------------------------------
// Border radius (numeric, used by mobile StyleSheet / dynamic layouts)
// ---------------------------------------------------------------------------

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Google Fonts import URL for web builds
// ---------------------------------------------------------------------------

export const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Outfit:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap";
