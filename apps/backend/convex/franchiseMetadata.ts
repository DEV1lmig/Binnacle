/**
 * Franchise metadata management for intelligent search fallback decisions
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update franchise metadata after caching games
 */
export const updateFranchiseMetadata = internalMutation({
  args: {
    franchiseName: v.string(),
    totalGamesOnIgdb: v.number(),
    cachedGamesCount: v.number(),
  },
  handler: async (ctx, args) => {
    const normalized = args.franchiseName.toLowerCase().trim();
    const now = Date.now();
    const completeness = (args.cachedGamesCount / Math.max(args.totalGamesOnIgdb, 1)) * 100;

    const existing = await ctx.db
      .query("franchiseMetadata")
      .withIndex("by_franchise_name", (q) => q.eq("franchiseName", normalized))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalGamesOnIgdb: args.totalGamesOnIgdb,
        cachedGamesCount: args.cachedGamesCount,
        lastCheckedAt: now,
        lastUpdatedAt: now,
        cacheCompleteness: completeness,
      });
    } else {
      await ctx.db.insert("franchiseMetadata", {
        franchiseName: normalized,
        totalGamesOnIgdb: args.totalGamesOnIgdb,
        cachedGamesCount: args.cachedGamesCount,
        lastCheckedAt: now,
        lastUpdatedAt: now,
        cacheCompleteness: completeness,
      });
    }

    return completeness;
  },
});

/**
 * Get franchise metadata for a search query
 */
export const getFranchiseMetadata = internalQuery({
  args: {
    franchiseName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.franchiseName.toLowerCase().trim();

    const metadata = await ctx.db
      .query("franchiseMetadata")
      .withIndex("by_franchise_name", (q) => q.eq("franchiseName", normalized))
      .unique();

    if (!metadata) {
      return null;
    }

    // Consider metadata stale if it's older than 7 days
    const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
    const isStale = Date.now() - metadata.lastCheckedAt > STALE_THRESHOLD_MS;

    return {
      ...metadata,
      isStale,
    };
  },
});

/**
 * Increment cached games count when a new game is added to a franchise
 */
export const incrementCachedCount = internalMutation({
  args: {
    franchiseName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.franchiseName.toLowerCase().trim();

    const existing = await ctx.db
      .query("franchiseMetadata")
      .withIndex("by_franchise_name", (q) => q.eq("franchiseName", normalized))
      .unique();

    if (existing) {
      const newCachedCount = existing.cachedGamesCount + 1;
      const completeness = (newCachedCount / Math.max(existing.totalGamesOnIgdb, 1)) * 100;

      await ctx.db.patch(existing._id, {
        cachedGamesCount: newCachedCount,
        lastUpdatedAt: Date.now(),
        cacheCompleteness: completeness,
      });
    }
  },
});
