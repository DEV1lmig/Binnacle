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

export const ratingToFiveStar = sharedRatingToFiveStar;

export const normalizeRatingToTen = sharedNormalizeRatingToTen;
