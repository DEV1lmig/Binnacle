export const SHARE_CARD_FORMATS = ["story", "square", "wide"];

export const SHARE_CARD_ACCENTS = ["gold", "cyan", "accent", "green", "amber"];

export const DEFAULT_SHARE_OPTIONS = {
  format: "story",
  accent: "gold",
  showText: true,
  showPoster: true,
};

export const SHARE_CARD_DIMENSIONS = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  wide: { width: 1200, height: 630 },
};

export const SHARE_ACCENT_COLORS = {
  gold: "#60A5FA",
  cyan: "#22D3EE",
  accent: "#A78BFA",
  green: "#34D399",
  amber: "#FBBF24",
};

export function ratingToFiveStar(ratingOutOf10) {
  if (!ratingOutOf10 || Number.isNaN(ratingOutOf10)) {
    return 0;
  }
  return Math.max(0, Math.min(5, ratingOutOf10 / 2));
}

export function getShareImageDimensions(format) {
  return SHARE_CARD_DIMENSIONS[format] ?? SHARE_CARD_DIMENSIONS.story;
}

export function getShareCardAccentColor(accent) {
  return SHARE_ACCENT_COLORS[accent] ?? SHARE_ACCENT_COLORS.gold;
}

export function buildShareImagePath(reviewId, options = {}) {
  const opts = { ...DEFAULT_SHARE_OPTIONS, ...options };
  const params = new URLSearchParams();
  params.set("format", opts.format);
  params.set("accent", opts.accent);
  params.set("text", opts.showText ? "1" : "0");
  params.set("poster", opts.showPoster ? "1" : "0");
  return `/api/og/review/${encodeURIComponent(reviewId)}?${params.toString()}`;
}

export function parseShareOptions(searchParams) {
  const get = (key, fallback) => {
    const value =
      typeof searchParams.get === "function" ? searchParams.get(key) : null;
    return value ?? fallback;
  };

  const format = SHARE_CARD_FORMATS.includes(get("format"))
    ? get("format")
    : DEFAULT_SHARE_OPTIONS.format;

  const accent = SHARE_CARD_ACCENTS.includes(get("accent"))
    ? get("accent")
    : DEFAULT_SHARE_OPTIONS.accent;

  const showText = get("text") !== "0";
  const showPoster = get("poster") !== "0";

  return { format, accent, showText, showPoster };
}
