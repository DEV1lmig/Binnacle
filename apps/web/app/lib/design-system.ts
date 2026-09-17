/** Playchive Shelf web palette. Hex values support legacy alpha suffixes. */
export { spacing, radius } from '@binnacle/design-tokens';
export const C = {
  bg: '#080F1F', bgAlt: '#0E1930', surface: '#14213B',
  border: '#2D3E59', borderLight: '#8494AB',
  text: '#FFFFFF', textMuted: '#B8C4D8', textDim: '#9AAFCB',
  primary: '#245CF2', primaryHover: '#1649E8',
  gold: '#FFC400', goldDim: '#C99A00', bloom: 'rgba(8,15,31,0.18)',
  cyan: '#FF914D', cyanDim: '#D24D00',
  accent: '#FF914D', accentDim: '#D24D00',
  green: '#FF914D', amber: '#FFC400', red: '#FF8A96',
} as const;
export const colors = C;
export const STATUS_COLORS: Record<string, string> = {
  playing: C.green, completed: C.amber, backlog: C.gold,
  onhold: C.amber, dropped: C.red,
};
export const FONT_HEADING = 'var(--playchive-display), Outfit, sans-serif';
export const FONT_BODY = 'var(--playchive-body), "DM Sans", sans-serif';
// Compatibility alias: interface labels use DM Sans instead of terminal lettering.
export const FONT_MONO = FONT_BODY;
export const FONT_IMPORT_URL = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap';
