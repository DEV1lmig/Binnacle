/**
 * Binnacle canonical design tokens — React Native entry.
 *
 * React Native does not support CSS `font-family` fallback lists like
 * `'Outfit', sans-serif`; any invalid font name makes text invisible.
 * This file provides system font constants for native while re-exporting
 * the platform-agnostic tokens from `tokens.base.ts`.
 */

export {
  colors,
  C,
  STATUS_COLORS,
  FONT_IMPORT_URL,
  spacing,
  radius,
} from "./tokens.base";

// React Native cannot parse CSS font-family fallback lists (e.g.
// "'Outfit', sans-serif"). On native, use concrete platform font
// names so inline `style={{ fontFamily: FONT_HEADING }}` renders.
// `process.env.EXPO_OS` is replaced at compile time by Expo.
const EXPO_OS = process.env.EXPO_OS as "ios" | "android" | "web" | undefined;

export const FONT_HEADING = EXPO_OS === "ios" ? "Helvetica" : "sans-serif";
export const FONT_MONO = "monospace";
export const FONT_BODY = EXPO_OS === "ios" ? "Helvetica" : "sans-serif";

// Debug: confirm which entry file Metro loaded in Expo Go logs.
console.log("[design-tokens] native entry", {
  EXPO_OS,
  FONT_HEADING,
  FONT_BODY,
  FONT_MONO,
});
