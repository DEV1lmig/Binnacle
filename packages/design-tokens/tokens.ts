/**
 * Binnacle canonical design tokens — web entry.
 *
 * Mirror of `theme.css`. Import this for runtime JS values (inline styles,
 * dynamic props, icon colors) and use the Tailwind classes from the CSS file
 * for static styling.
 */

export {
  colors,
  C,
  STATUS_COLORS,
  FONT_IMPORT_URL,
  spacing,
  radius,
} from "./tokens.base";

// CSS `font-family` stacks for web inline styles. React Native cannot parse
// these strings, so `tokens.native.ts` supplies system font names instead.
export const FONT_HEADING: string | undefined = "'Outfit', sans-serif";
export const FONT_MONO = "'Geist Mono', 'JetBrains Mono', monospace";
export const FONT_BODY: string | undefined = "'DM Sans', sans-serif";
