/*
 * Utilities for classifying and ranking IGDB search results on the client.
 * Mapping derived from IGDB game_type/category enum values:
 * https://api-docs.igdb.com/#game-enums
 */

export enum GameKindBucket {
  Mainline = "mainline",
  EnhancedRelease = "enhancedRelease",
  AdditionalContent = "additionalContent",
  FanOrFork = "fanOrFork",
  Other = "other",
}

export type ClassificationSource = "game_type" | "category" | "relationship" | "fallback";

type GameTypeClassification = {
  bucket: GameKindBucket;
  label: string;
};

const BUCKET_DEFAULT_LABEL: Record<GameKindBucket, string> = {
  [GameKindBucket.Mainline]: "Main Game",
  [GameKindBucket.EnhancedRelease]: "Enhanced Release",
  [GameKindBucket.AdditionalContent]: "Additional Content",
  [GameKindBucket.FanOrFork]: "Fan Project",
  [GameKindBucket.Other]: "Other",
};

const GAME_TYPE_CLASSIFICATIONS: Record<number, GameTypeClassification> = {
  0: { bucket: GameKindBucket.Mainline, label: "Main Game" }, // main_game
  1: { bucket: GameKindBucket.AdditionalContent, label: "DLC" }, // dlc_addon
  2: { bucket: GameKindBucket.AdditionalContent, label: "Expansion" },
  3: { bucket: GameKindBucket.AdditionalContent, label: "Bundle" },
  4: { bucket: GameKindBucket.AdditionalContent, label: "Standalone Expansion" },
  5: { bucket: GameKindBucket.FanOrFork, label: "Mod" },
  6: { bucket: GameKindBucket.AdditionalContent, label: "Episode" },
  7: { bucket: GameKindBucket.AdditionalContent, label: "Season" },
  8: { bucket: GameKindBucket.EnhancedRelease, label: "Remake" },
  9: { bucket: GameKindBucket.EnhancedRelease, label: "Remaster" },
  10: { bucket: GameKindBucket.EnhancedRelease, label: "Expanded Game" },
  11: { bucket: GameKindBucket.EnhancedRelease, label: "Port" },
  12: { bucket: GameKindBucket.FanOrFork, label: "Fork" },
  13: { bucket: GameKindBucket.AdditionalContent, label: "Pack" },
  14: { bucket: GameKindBucket.AdditionalContent, label: "Update" },
};

const RELATIONSHIP_CLASSIFICATIONS = {
  versionParent: {
    bucket: GameKindBucket.EnhancedRelease,
    label: "Alternate Version",
  },
  parentGame: {
    bucket: GameKindBucket.AdditionalContent,
    label: "Related Content",
  },
} as const;

export const BUCKET_PRIORITY: Record<GameKindBucket, number> = {
  [GameKindBucket.Mainline]: 0,
  [GameKindBucket.EnhancedRelease]: 1,
  [GameKindBucket.AdditionalContent]: 2,
  [GameKindBucket.FanOrFork]: 3,
  [GameKindBucket.Other]: 4,
};

export type ClassificationInput = {
  gameType?: number | null;
  category?: number | null;
  parentGameId?: number | null;
  versionParentId?: number | null;
};

export type ClassificationResult = {
  bucket: GameKindBucket;
  label: string;
  source: ClassificationSource;
};

function resolveClassification(
  value: number | null | undefined,
  source: ClassificationSource
): ClassificationResult | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const mapping = GAME_TYPE_CLASSIFICATIONS[value];
  if (mapping) {
    return { ...mapping, source };
  }

  return {
    bucket: GameKindBucket.Other,
    label: BUCKET_DEFAULT_LABEL[GameKindBucket.Other],
    source,
  };
}

function resolveRelationshipClassification(
  meta: ClassificationInput
): ClassificationResult | undefined {
  if (meta.versionParentId) {
    return {
      ...RELATIONSHIP_CLASSIFICATIONS.versionParent,
      source: "relationship",
    };
  }

  if (meta.parentGameId) {
    return {
      ...RELATIONSHIP_CLASSIFICATIONS.parentGame,
      source: "relationship",
    };
  }

  return undefined;
}

const FALLBACK_RESULT: ClassificationResult = {
  bucket: GameKindBucket.Mainline,
  label: BUCKET_DEFAULT_LABEL[GameKindBucket.Mainline],
  source: "fallback",
};

export function classifyIgdbGame(meta: ClassificationInput): ClassificationResult {
  const byGameType = resolveClassification(meta.gameType, "game_type");
  if (byGameType) {
    return byGameType;
  }

  const byCategory = resolveClassification(meta.category, "category");
  if (byCategory) {
    return byCategory;
  }

  const byRelationship = resolveRelationshipClassification(meta);
  if (byRelationship) {
    return byRelationship;
  }

  // Without metadata default to mainline, keeping legitimate titles prominent.
  return FALLBACK_RESULT;
}

export type ClassificationSortOptions<T> = {
  query?: string;
  getTitle?: (item: T) => string | undefined;
  getReleaseYear?: (item: T) => number | null | undefined;
  allowedBuckets?: readonly GameKindBucket[];
};

export function classifyAndSortResults<T extends object>(
  items: readonly T[],
  getMeta: (item: T) => ClassificationInput,
  options?: ClassificationSortOptions<T>
): Array<T & { classification: ClassificationResult }> {
  const query = options?.query?.trim() ?? "";
  const hasQuery = query.length > 0;
  const normalizedQuery = hasQuery ? normalizeText(query) : "";
  const queryTokens = hasQuery ? tokenize(normalizedQuery) : [];

  const getTitle = options?.getTitle
    ?? ((item: T) => {
      const candidate = (item as Record<string, unknown>).title;
      return typeof candidate === "string" ? candidate : undefined;
    });

  const getReleaseYear = options?.getReleaseYear
    ?? ((item: T) => {
      const candidate = (item as Record<string, unknown>).releaseYear;
      return typeof candidate === "number" ? candidate : undefined;
    });

  const annotated = items.map((item, index) => {
    const classification = classifyIgdbGame(getMeta(item));
    const title = hasQuery ? getTitle(item) : undefined;
    const ranking = hasQuery ? computeRankingMetrics(title, queryTokens) : undefined;
    const releaseYear = hasQuery ? getReleaseYear(item) ?? undefined : undefined;
    return { item, index, classification, ranking, releaseYear };
  });

  const filtered = options?.allowedBuckets?.length
    ? annotated.filter(({ classification }) =>
        options.allowedBuckets!.includes(classification.bucket)
      )
    : annotated;

  filtered.sort((a, b) => {
    const bucketDelta =
      BUCKET_PRIORITY[a.classification.bucket] - BUCKET_PRIORITY[b.classification.bucket];
    if (bucketDelta !== 0) {
      return bucketDelta;
    }
    if (!hasQuery || !a.ranking || !b.ranking) {
      return a.index - b.index;
    }

    const exactDelta = compareBoolean(a.ranking.exactMatch, b.ranking.exactMatch);
    if (exactDelta !== 0) {
      return exactDelta;
    }

    const prefixDelta = b.ranking.prefixMatchLength - a.ranking.prefixMatchLength;
    if (prefixDelta !== 0) {
      return prefixDelta;
    }

    const longestDelta = b.ranking.longestMatchLength - a.ranking.longestMatchLength;
    if (longestDelta !== 0) {
      return longestDelta;
    }

    const fullMatchStartDelta = compareNumber(a.ranking.fullMatchStart, b.ranking.fullMatchStart);
    if (fullMatchStartDelta !== 0) {
      return fullMatchStartDelta;
    }

    const numericDelta = compareNumber(
      a.ranking.numericSuffix ?? Number.POSITIVE_INFINITY,
      b.ranking.numericSuffix ?? Number.POSITIVE_INFINITY
    );
    if (numericDelta !== 0) {
      return numericDelta;
    }

    const extraTokenDelta = compareNumber(a.ranking.extraTokenCount, b.ranking.extraTokenCount);
    if (extraTokenDelta !== 0) {
      return extraTokenDelta;
    }

    const releaseDelta = compareNumber(
      a.releaseYear ?? Number.POSITIVE_INFINITY,
      b.releaseYear ?? Number.POSITIVE_INFINITY
    );
    if (releaseDelta !== 0) {
      return releaseDelta;
    }

    return a.index - b.index;
  });

  return filtered.map(({ item, classification }) => ({
    ...(item as Record<string, unknown>),
    classification,
  })) as Array<T & { classification: ClassificationResult }>;
}

type RankingMetrics = {
  exactMatch: boolean;
  prefixMatchLength: number;
  longestMatchLength: number;
  fullMatchStart: number;
  numericSuffix?: number;
  extraTokenCount: number;
};

const NO_MATCH: RankingMetrics = {
  exactMatch: false,
  prefixMatchLength: 0,
  longestMatchLength: 0,
  fullMatchStart: Number.POSITIVE_INFINITY,
  numericSuffix: undefined,
  extraTokenCount: Number.POSITIVE_INFINITY,
};

function computeRankingMetrics(title: string | undefined, queryTokens: string[]): RankingMetrics {
  if (!title) {
    return NO_MATCH;
  }

  const titleTokens = tokenize(normalizeText(title));
  if (titleTokens.length === 0 || queryTokens.length === 0) {
    return NO_MATCH;
  }

  let prefixMatchLength = 0;
  while (
    prefixMatchLength < queryTokens.length &&
    prefixMatchLength < titleTokens.length &&
    titleTokens[prefixMatchLength] === queryTokens[prefixMatchLength]
  ) {
    prefixMatchLength += 1;
  }

  let longestMatchLength = 0;
  let fullMatchStart = Number.POSITIVE_INFINITY;
  for (let i = 0; i < titleTokens.length; i += 1) {
    let span = 0;
    while (
      span < queryTokens.length &&
      i + span < titleTokens.length &&
      titleTokens[i + span] === queryTokens[span]
    ) {
      span += 1;
    }
    if (span > longestMatchLength) {
      longestMatchLength = span;
    }
    if (span === queryTokens.length && i < fullMatchStart) {
      fullMatchStart = i;
    }
  }

  const exactMatch =
    prefixMatchLength === queryTokens.length && titleTokens.length === queryTokens.length;

  let numericSuffix: number | undefined;
  if (prefixMatchLength === queryTokens.length) {
    const suffixToken = titleTokens[queryTokens.length];
    const numericValue = suffixToken ? extractNumericToken(suffixToken) : undefined;
    if (numericValue !== undefined) {
      numericSuffix = numericValue;
    } else if (titleTokens.length === queryTokens.length) {
      numericSuffix = 0;
    }
  }

  const effectiveMatchLength = Math.max(prefixMatchLength, longestMatchLength);
  const extraTokenCount = titleTokens.length - effectiveMatchLength;

  return {
    exactMatch,
    prefixMatchLength,
    longestMatchLength,
    fullMatchStart,
    numericSuffix,
    extraTokenCount,
  };
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  if (!value) {
    return [];
  }
  return value.split(/\s+/).filter(Boolean);
}

function extractNumericToken(token: string): number | undefined {
  if (/^\d+$/.test(token)) {
    return Number(token);
  }

  const roman = romanToNumber(token);
  if (roman !== undefined) {
    return roman;
  }

  return undefined;
}

function romanToNumber(token: string): number | undefined {
  const map: Record<string, number> = {
    m: 1000,
    d: 500,
    c: 100,
    l: 50,
    x: 10,
    v: 5,
    i: 1,
  };

  const chars = token.toLowerCase().split("");
  if (chars.some((char) => map[char] === undefined)) {
    return undefined;
  }

  let total = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const current = map[chars[i]];
    const next = map[chars[i + 1]] ?? 0;
    if (current < next) {
      total -= current;
    } else {
      total += current;
    }
  }

  return total > 0 ? total : undefined;
}

function compareBoolean(a: boolean, b: boolean): number {
  if (a === b) {
    return 0;
  }
  return a ? -1 : 1;
}

function compareNumber(a: number, b: number): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}