/**
 * Binnacle Design System v2 - Futuristic HUD Aesthetic
 *
 * Shared palette, typography, and reusable primitives extracted from the
 * landing page design system. Import `C` for colors, use the font-family
 * constants for inline styles, and import React components for decorative
 * overlays (GrainOverlay, DotGrid, CornerMarkers, HudBadge).
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const C = {
  bg: "#0B0E14",
  bgAlt: "#111620",
  surface: "#161B26",
  border: "#1E2636",
  borderLight: "#2A3448",
  text: "#E2E8F0",
  textMuted: "#8494A7",
  textDim: "#4A5568",
  gold: "#60A5FA",
  goldDim: "#3B82F6",
  cyan: "#22D3EE",
  cyanDim: "#06B6D4",
  bloom: "rgba(96, 165, 250, 0.08)",
  accent: "#A78BFA",
  accentDim: "#7C3AED",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#EF4444",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT_HEADING = "'Outfit', sans-serif";
export const FONT_MONO = "'Geist Mono', 'JetBrains Mono', monospace";
export const FONT_BODY = "'DM Sans', sans-serif";

export const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Outfit:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap";

// ---------------------------------------------------------------------------
// Status colors (game backlog statuses)
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  playing: C.green,
  completed: C.amber,
  backlog: C.gold,
  onhold: "#FBBF24",
  dropped: C.red,
};
