/**
 * Feature flags for gradual rollout.
 * Extend this as you add more features.
 */

export const FEATURE_FLAGS = {
  favorites_ui: process.env.NEXT_PUBLIC_FAVORITES_UI === "true",
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
