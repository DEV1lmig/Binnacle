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

export function ratingToFiveStar(ratingOutOf10: number | undefined | null) {
  if (!ratingOutOf10 || Number.isNaN(ratingOutOf10)) {
    return 0;
  }

  return Math.max(0, Math.min(5, ratingOutOf10 / 2));
}
