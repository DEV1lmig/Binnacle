import { describe, expect, it } from "vitest";
import {
  classifyAndSortResults,
  classifyIgdbGame,
  GameKindBucket,
  type ClassificationInput,
} from "./igdbClassification";

describe("classifyIgdbGame", () => {
  const gameTypeCases: Array<{
    value: number;
    bucket: GameKindBucket;
    label: string;
  }> = [
    { value: 0, bucket: GameKindBucket.Mainline, label: "Main Game" },
    { value: 1, bucket: GameKindBucket.AdditionalContent, label: "DLC" },
    { value: 2, bucket: GameKindBucket.AdditionalContent, label: "Expansion" },
    { value: 3, bucket: GameKindBucket.AdditionalContent, label: "Bundle" },
    { value: 4, bucket: GameKindBucket.AdditionalContent, label: "Standalone Expansion" },
    { value: 5, bucket: GameKindBucket.FanOrFork, label: "Mod" },
    { value: 6, bucket: GameKindBucket.AdditionalContent, label: "Episode" },
    { value: 7, bucket: GameKindBucket.AdditionalContent, label: "Season" },
    { value: 8, bucket: GameKindBucket.EnhancedRelease, label: "Remake" },
    { value: 9, bucket: GameKindBucket.EnhancedRelease, label: "Remaster" },
    { value: 10, bucket: GameKindBucket.EnhancedRelease, label: "Expanded Game" },
    { value: 11, bucket: GameKindBucket.EnhancedRelease, label: "Port" },
    { value: 12, bucket: GameKindBucket.FanOrFork, label: "Fork" },
    { value: 13, bucket: GameKindBucket.AdditionalContent, label: "Pack" },
    { value: 14, bucket: GameKindBucket.AdditionalContent, label: "Update" },
  ];

  for (const testCase of gameTypeCases) {
    it(`classifies game_type ${testCase.value}`, () => {
      const result = classifyIgdbGame({ gameType: testCase.value });
      expect(result.bucket).toBe(testCase.bucket);
      expect(result.label).toBe(testCase.label);
      expect(result.source).toBe("game_type");
    });
  }

  it("falls back to category metadata", () => {
    const result = classifyIgdbGame({ category: 9 });
    expect(result.bucket).toBe(GameKindBucket.EnhancedRelease);
    expect(result.label).toBe("Remaster");
    expect(result.source).toBe("category");
  });

  it("uses relationship heuristic for version parents", () => {
    const result = classifyIgdbGame({ versionParentId: 1234 });
    expect(result.bucket).toBe(GameKindBucket.EnhancedRelease);
    expect(result.label).toBe("Alternate Version");
    expect(result.source).toBe("relationship");
  });

  it("uses relationship heuristic for parent games", () => {
    const result = classifyIgdbGame({ parentGameId: 4567 });
    expect(result.bucket).toBe(GameKindBucket.AdditionalContent);
    expect(result.label).toBe("Related Content");
    expect(result.source).toBe("relationship");
  });

  it("defaults to mainline when metadata is missing", () => {
    const result = classifyIgdbGame({});
    expect(result.bucket).toBe(GameKindBucket.Mainline);
    expect(result.label).toBe("Main Game");
    expect(result.source).toBe("fallback");
  });
});

describe("classifyAndSortResults", () => {
  const sample = [
    { id: "fan", meta: { gameType: 5 } satisfies ClassificationInput },
    { id: "mainline", meta: { gameType: 0 } satisfies ClassificationInput },
    { id: "enhanced", meta: { gameType: 9 } satisfies ClassificationInput },
    { id: "fallback", meta: {} satisfies ClassificationInput },
  ];

  it("sorts by bucket priority and preserves relevance order", () => {
    const sorted = classifyAndSortResults(sample, (item) => item.meta);
    const orderedIds = sorted.map((item) => item.id);
    expect(orderedIds).toEqual(["mainline", "fallback", "enhanced", "fan"]);
  });

  it("preserves relative order within the same bucket", () => {
    const duplicates = [
      { id: "a", meta: { gameType: 0 } satisfies ClassificationInput },
      { id: "b", meta: { gameType: 0 } satisfies ClassificationInput },
      { id: "c", meta: { gameType: 1 } satisfies ClassificationInput },
    ];

    const sorted = classifyAndSortResults(duplicates, (item) => item.meta);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });

  it("prioritizes close title matches when a query is provided", () => {
    const items = [
      {
        id: "world",
        title: "Super Mario World",
        releaseYear: 1990,
        meta: { gameType: 0 } satisfies ClassificationInput,
      },
      {
        id: "smb3",
        title: "Super Mario Bros. 3",
        releaseYear: 1990,
        meta: { gameType: 0 } satisfies ClassificationInput,
      },
      {
        id: "smb",
        title: "Super Mario Bros.",
        releaseYear: 1985,
        meta: { gameType: 0 } satisfies ClassificationInput,
      },
      {
        id: "smb2",
        title: "Super Mario Bros. 2",
        releaseYear: 1988,
        meta: { gameType: 0 } satisfies ClassificationInput,
      },
      {
        id: "galaxy",
        title: "Super Mario Galaxy",
        releaseYear: 2007,
        meta: { gameType: 0 } satisfies ClassificationInput,
      },
    ];

    const sorted = classifyAndSortResults(
      items,
      (item) => item.meta,
      {
        query: "Super Mario Bros",
        getTitle: (item) => item.title,
        getReleaseYear: (item) => item.releaseYear,
      }
    );

    expect(sorted.map((entry) => entry.id)).toEqual([
      "smb",
      "smb2",
      "smb3",
      "world",
      "galaxy",
    ]);
  });

  it("filters out additional content when allowed buckets are specified", () => {
    const items = [
      { id: "dlc", meta: { gameType: 1 } satisfies ClassificationInput },
      { id: "expansion", meta: { gameType: 2 } satisfies ClassificationInput },
      { id: "main", meta: { gameType: 0 } satisfies ClassificationInput },
      { id: "remaster", meta: { gameType: 9 } satisfies ClassificationInput },
    ];

    const sorted = classifyAndSortResults(
      items,
      (item) => item.meta,
      { allowedBuckets: [GameKindBucket.Mainline, GameKindBucket.EnhancedRelease] }
    );

    expect(sorted.map((entry) => entry.id)).toEqual(["main", "remaster"]);
  });
});
