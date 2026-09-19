import { describe, expect, test } from "vitest";
import {
  advanceWatermark,
  backoffDelayMs,
  clampPageSize,
  classifyStatus,
  coverUrlFromImageId,
  isOverdue,
  isUnchanged,
  mergeFailedIds,
  normalizeBasicGame,
  releaseYearFromTimestamp,
  safeEqual,
  sanitizeError,
} from "./igdbSync";

describe("normalizeBasicGame", () => {
  test("maps IGDB fields to game columns", () => {
    const game = normalizeBasicGame({
      id: 7346,
      name: "The Legend of Zelda: Breath of the Wild",
      cover: { image_id: "co3p2d" },
      first_release_date: 1488499200,
      game_type: 0,
      genres: [{ id: 31, name: "Adventure" }],
      involved_companies: [
        { company: { id: 70, name: "Nintendo" }, developer: true, publisher: true },
        { company: { id: 1, name: "Support Studio" } },
      ],
      franchise: { id: 596, name: "The Legend of Zelda" },
      total_rating: 92.1,
      updated_at: 1700000000,
      checksum: "abc",
    });

    expect(game).toMatchObject({
      igdbId: 7346,
      title: "The Legend of Zelda: Breath of the Wild",
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg",
      releaseYear: 2017,
      firstReleaseDate: 1488499200,
      gameType: 0,
      franchise: "The Legend of Zelda",
      igdbUpdatedAt: 1700000000,
      igdbChecksum: "abc",
    });
    expect(JSON.parse(game!.developers!)).toEqual([{ id: 70, name: "Nintendo", role: "Developer" }]);
    expect(JSON.parse(game!.publishers!)).toEqual([{ id: 70, name: "Nintendo", role: "Publisher" }]);
  });

  test("never emits undefined keys", () => {
    const game = normalizeBasicGame({ id: 1, name: "Bare" })!;
    expect(Object.values(game).every((value) => value !== undefined)).toBe(true);
    expect(Object.keys(game).sort()).toEqual(["igdbId", "title"]);
  });

  test("falls back to the legacy category when game_type is absent", () => {
    expect(normalizeBasicGame({ id: 1, name: "DLC", category: 1 })!.gameType).toBe(1);
    expect(normalizeBasicGame({ id: 1, name: "Main", category: 1, game_type: 0 })!.gameType).toBe(0);
  });

  test("rejects partial payloads", () => {
    expect(normalizeBasicGame({ id: 5 })).toBeNull();
    expect(normalizeBasicGame({ name: "No id" } as never)).toBeNull();
  });
});

describe("dates and covers", () => {
  test("converts unix seconds to a UTC year", () => {
    expect(releaseYearFromTimestamp(1488499200)).toBe(2017);
    expect(releaseYearFromTimestamp(0)).toBe(1970);
    expect(releaseYearFromTimestamp(undefined)).toBeUndefined();
  });

  test("builds cover URLs only when there is an image", () => {
    expect(coverUrlFromImageId("co1abc")).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg");
    expect(coverUrlFromImageId(undefined)).toBeUndefined();
  });
});

describe("isUnchanged", () => {
  test("compares checksums first", () => {
    expect(isUnchanged({ igdbChecksum: "a" }, { igdbChecksum: "a" })).toBe(true);
    expect(isUnchanged({ igdbChecksum: "a", igdbUpdatedAt: 9 }, { igdbChecksum: "b", igdbUpdatedAt: 9 })).toBe(false);
  });

  test("falls back to updated_at", () => {
    expect(isUnchanged({ igdbUpdatedAt: 10 }, { igdbUpdatedAt: 10 })).toBe(true);
    expect(isUnchanged({ igdbUpdatedAt: 10 }, { igdbUpdatedAt: 11, igdbChecksum: "b" })).toBe(false);
  });

  test("treats games without sync data as changed", () => {
    expect(isUnchanged({}, { igdbChecksum: "a", igdbUpdatedAt: 1 })).toBe(false);
  });
});

describe("cursor", () => {
  test("moves to the newest value of the page", () => {
    expect(advanceWatermark(100, [100, 105, 120], 100)).toBe(120);
  });

  test("stays put on an empty page", () => {
    expect(advanceWatermark(100, [], 100)).toBe(100);
  });

  test("steps over a full page of ties so the job cannot loop forever", () => {
    expect(advanceWatermark(100, Array(100).fill(100), 100)).toBe(101);
    expect(advanceWatermark(100, Array(40).fill(100), 100)).toBe(100);
  });

  test("clamps the page size to 1..100", () => {
    expect(clampPageSize(undefined)).toBe(100);
    expect(clampPageSize(5000)).toBe(100);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(NaN)).toBe(100);
  });
});

describe("errors", () => {
  test("classifies which statuses are retried", () => {
    expect(classifyStatus(429)).toBe("retryable");
    expect(classifyStatus(503)).toBe("retryable");
    expect(classifyStatus(401)).toBe("auth");
    expect(classifyStatus(400)).toBe("fatal");
    expect(classifyStatus(406)).toBe("fatal");
  });

  test("backs off exponentially up to a cap", () => {
    expect([0, 1, 2, 10].map((attempt) => backoffDelayMs(attempt))).toEqual([500, 1000, 2000, 8000]);
  });

  test("redacts credentials and truncates", () => {
    const message = sanitizeError(new Error(`Bearer abc123.def failed client_secret=hunter2 ${"x".repeat(500)}`));
    expect(message).not.toContain("abc123");
    expect(message).not.toContain("hunter2");
    expect(message.length).toBeLessThanOrEqual(300);
  });

  test("keeps a bounded, deduplicated list of failed ids", () => {
    expect(mergeFailedIds([1, 2], [2, 3])).toEqual([1, 2, 3]);
    expect(mergeFailedIds([], Array.from({ length: 80 }, (_, i) => i))).toHaveLength(50);
  });
});

describe("misc", () => {
  test("safeEqual", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "secret2")).toBe(false);
    expect(safeEqual("", "secret")).toBe(false);
  });

  test("flags a job after two missed periods", () => {
    const day = 24 * 60 * 60 * 1000;
    expect(isOverdue("recent_releases", 0, day * 2)).toBe(false);
    expect(isOverdue("recent_releases", 0, day * 2 + 1)).toBe(true);
    expect(isOverdue("backfill", 0, day * 365)).toBe(false);
    expect(isOverdue("popular", undefined, day)).toBe(false);
  });
});
