import {
  ratingToFiveStar as sharedRatingToFiveStar,
  normalizeRatingToTen as sharedNormalizeRatingToTen,
} from "@binnacle/shared-types";

export function formatNumber(value: number | undefined | null) {
  if (!value || Number.isNaN(value)) {
    return "0";
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(Math.round(value));
}

export function formatDate(timestamp: number | undefined | null) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * IGDB image URLs are stored at t_cover_big (264×374), which pixelates when
 * rendered full-width. Swap the size segment for a larger named size.
 */
export function igdbImageUrl(
  url: string | undefined | null,
  size: "t_cover_big_2x" | "t_720p" | "t_1080p" = "t_1080p"
) {
  if (!url) return undefined;
  if (!url.includes("images.igdb.com")) return url;
  return url.replace(/\/t_[^/]+\//, `/${size}/`);
}

export const ratingToFiveStar = sharedRatingToFiveStar;

export const normalizeRatingToTen = sharedNormalizeRatingToTen;
