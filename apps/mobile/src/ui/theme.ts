/**
 * Mobile theme entry point — re-exports canonical tokens with legacy names
 * so existing StyleSheet code keeps compiling while the app migrates to
 * Tailwind className usage.
 *
 * Prefer importing from `@binnacle/design-tokens` for new code.
 */

import {
  colors as canonicalColors,
  spacing as canonicalSpacing,
  radius as canonicalRadius,
} from "@binnacle/design-tokens";

export const colors = {
  bg: canonicalColors.bg,
  surface: canonicalColors.surface,
  surfaceAlt: canonicalColors.bgAlt,
  border: canonicalColors.border,
  textPrimary: canonicalColors.text,
  textSecondary: canonicalColors.textMuted,
  accent: canonicalColors.gold,
  accentMuted: canonicalColors.goldDim,
  success: canonicalColors.green,
  danger: canonicalColors.red,
  warning: canonicalColors.amber,
} as const;

export const spacing = canonicalSpacing;
export const radius = canonicalRadius;

export { STATUS_COLORS } from "@binnacle/design-tokens";
