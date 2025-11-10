/**
 * Efficient batch seeding for quick database population
 * Optimized for launch: Seeds most-searched categories in parallel
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { measureQuerySize } from "./lib/bandwidthMonitor";

type SeedPlan = { trending: number; topRated: number; newReleases: number };

const MAX_CUSTOM_LIMITS: SeedPlan = {
  trending: 5000,
  topRated: 5000,
  newReleases: 5000,
};

const MIN_CUSTOM_LIMITS: SeedPlan = {
  trending: 10,
  topRated: 10,
  newReleases: 10,
};

/**
 * Seeds multiple categories in an efficient order
 * Priority: Most likely to be searched by users
 */
export const seedForLaunch = action({
  args: {
    mode: v.optional(v.union(
      v.literal("minimal"),    // ~1,500 games, ~15 min
      v.literal("standard"),   // ~5,000 games, 45-60 min
      v.literal("comprehensive"), // ~8,000+ games, 90-120 min
      v.literal("custom")      // Custom limits
    )),
    dryRun: v.optional(v.boolean()),
    // Custom limits (only used when mode = "custom")
    customLimits: v.optional(v.object({
      trending: v.number(),
      topRated: v.number(),
      newReleases: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // 🚨 CRITICAL: Prevent seeding in production to control database costs
    if (process.env.ENVIRONMENT === "production" || !process.env.ALLOW_SEEDING) {
      console.error(
        "❌ [seedForLaunch] BLOCKED: Seeding is disabled in production to protect database quota (1GB/month limit)"
      );
      throw new Error(
        "Seeding is disabled in production. Set ALLOW_SEEDING=true and ENVIRONMENT=development to enable."
      );
    }

    const mode = args.mode ?? "standard";
    const dryRun = args.dryRun ?? false;

    console.log(`[seedForLaunch] ⚠️  WARNING: Starting ${mode} seed${dryRun ? " (DRY RUN)" : ""}...`);
    console.log(`[seedForLaunch] This operation costs write units. Monitor usage!`);

    const startTime = Date.now();

    let customPlan: SeedPlan | undefined;
    if (mode === "custom") {
      customPlan = validateCustomLimits(args.customLimits);
    }

    const seedPlan: SeedPlan = customPlan ?? getSeedPlan(mode);
    
    console.log(`[seedForLaunch] Plan: ${JSON.stringify(seedPlan, null, 2)}`);

    if (dryRun) {
      return {
        success: true,
        mode,
        plan: seedPlan,
        estimatedGames: estimateGames(seedPlan),
        estimatedTime: estimateTime(seedPlan),
        message: "Dry run complete. Use dryRun: false to execute.",
        dryRun: true,
        timestamp: Date.now(),
      };
    }

    const results: any[] = [];

    try {
      // Step 1: Seed trending/popular games (most searched)
      console.log(`[seedForLaunch] Step 1/3: Trending & Popular Games`);
      const trending = await ctx.runAction(api.igdb.seedTrendingGames, {
        limit: seedPlan.trending,
      });
      results.push({ category: "trending", ...trending });

      // Step 2: Seed top rated (users search for "best games")
      console.log(`[seedForLaunch] Step 2/3: Top Rated Games`);
      const topRated = await ctx.runAction(api.igdb.seedTopRatedGames, {
        limit: seedPlan.topRated,
      });
      results.push({ category: "topRated", ...topRated });

      // Step 3: Seed new releases (users search for "new games")
      console.log(`[seedForLaunch] Step 3/3: New Releases`);
      const newReleases = await ctx.runAction(api.igdb.seedNewReleases, {
        limit: seedPlan.newReleases,
      });
      results.push({ category: "newReleases", ...newReleases });

      const totalGames = results.reduce((sum, r) => sum + (r.gamesCached || 0), 0);
      const duration = Date.now() - startTime;

      console.log(`[seedForLaunch] ✓ Complete: ${totalGames} games in ${(duration / 1000 / 60).toFixed(1)} minutes`);

      const result = {
        success: true,
        mode,
        totalGames,
        durationMs: duration,
        durationMinutes: duration / 1000 / 60,
        results,
        plan: seedPlan,
        timestamp: Date.now(),
      };
      return measureQuerySize(result, "seedForLaunch");

    } catch (error) {
      console.error(`[seedForLaunch] Error: ${error}`);
      const result = {
        success: false,
        error: String(error),
        results,
        plan: seedPlan,
        timestamp: Date.now(),
      };
      return measureQuerySize(result, "seedForLaunch (error)");
    }
  },
});

/**
 * Background job: Continuously seed popular franchises
 * Run this AFTER launch to gradually build library
 */
export const backgroundSeedFranchises = action({
  args: {
    batchSize: v.optional(v.number()), // Franchises per batch
    delayMs: v.optional(v.number()),   // Delay between batches
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    franchisesProcessed: number;
    totalGamesSeeded: number;
    results: { franchise: string; gamesAdded: number; error?: string }[];
    timestamp: number;
  }> => {
    const batchSize = args.batchSize ?? 10;
    const delayMs = args.delayMs ?? 60000; // 1 minute default

    console.log(`[backgroundSeedFranchises] Starting background seeding: ${batchSize} franchises per batch, ${delayMs}ms delay`);

    // This would run in batches with delays
    // For now, just call the main seeder
    return await ctx.runAction(api.seedFranchises.seedPopularFranchises, {
      limit: 20, // 20 games per franchise
    });
  },
});

// Helper functions

function getSeedPlan(mode: "minimal" | "standard" | "comprehensive" | "custom"): SeedPlan {
  switch (mode) {
    case "minimal": // Quick launch: ~1,500 games, ~15 minutes
      return {
        trending: 400,
        topRated: 900,
        newReleases: 200,
      };
    case "standard": // Balanced: ~5,000 games, 45-60 min
      return {
        trending: 1200,
        topRated: 3200,
        newReleases: 600,
      };
    case "comprehensive": // Full library: ~8,000+ games, 90-120 min
      return {
        trending: 1500,
        topRated: 5000,
        newReleases: 1500,
      };
    case "custom": // Will be overridden by customLimits arg; fallback mirrors standard
      return {
        trending: 1200,
        topRated: 3200,
        newReleases: 600,
      };
  }
}

function validateCustomLimits(limits?: SeedPlan): SeedPlan {
  if (!limits) {
    throw new Error("Custom limits are required when mode is set to custom.");
  }

  const sanitized: SeedPlan = { ...limits };
  (Object.keys(sanitized) as (keyof SeedPlan)[]).forEach((key) => {
    const value = sanitized[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Invalid ${String(key)} limit. Must be a finite number.`);
    }

    const rounded = Math.floor(value);
    if (rounded <= 0) {
      throw new Error(`Invalid ${String(key)} limit. Must be greater than 0.`);
    }

    const min = MIN_CUSTOM_LIMITS[key];
    const max = MAX_CUSTOM_LIMITS[key];
    sanitized[key] = Math.min(Math.max(rounded, min), max);
  });

  return sanitized;
}

function estimateGames(plan: SeedPlan) {
  // Account for duplicates (~30% overlap)
  const total = plan.trending + plan.topRated + plan.newReleases;
  return Math.floor(total * 0.7);
}

function estimateTime(plan: SeedPlan) {
  const totalGames = estimateGames(plan);
  // ~100 games per minute (IGDB rate limits)
  const minutes = Math.ceil(totalGames / 100);
  return `${minutes} minutes`;
}
