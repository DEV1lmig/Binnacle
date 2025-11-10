/**
 * Efficient franchise seeding for database population
 * Seeds entire franchises at once to build a comprehensive game library
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { measureQuerySize } from "./lib/bandwidthMonitor";

/**
 * Seed games from a list of popular franchises
 * This is more efficient than random seeding because:
 * 1. Focuses on games users will actually search for
 * 2. Populates franchise metadata automatically
 * 3. Ensures franchise-aware search works well
 */
export const seedPopularFranchises = action({
  args: {
    limit: v.optional(v.number()), // Games per franchise
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 🚨 CRITICAL: Prevent seeding in production to control database costs
    if (process.env.ENVIRONMENT === "production" || !process.env.ALLOW_SEEDING) {
      console.error(
        "❌ [seedPopularFranchises] BLOCKED: Franchise seeding is disabled in production (1GB/month quota protection)"
      );
      throw new Error(
        "Franchise seeding is disabled in production. Set ALLOW_SEEDING=true and ENVIRONMENT=development to enable."
      );
    }

    const limit = args.limit ?? 30; // Default: top 30 games per franchise
    const dryRun = args.dryRun ?? false;

    console.log(
      `[seedPopularFranchises] ⚠️  WARNING: Seeding franchises (limit: ${limit} games/franchise)${dryRun ? " (DRY RUN)" : ""}`
    );
    console.log(`[seedPopularFranchises] This operation costs significant write units. Monitor usage!`);

    // Top 50 most searched franchises (based on popularity)
    const topFranchises = [
      "Mario",
      "The Legend of Zelda",
      "Pokemon",
      "Final Fantasy",
      "Call of Duty",
      "Grand Theft Auto",
      "Assassin's Creed",
      "The Elder Scrolls",
      "Fallout",
      "Metal Gear",
      "Resident Evil",
      "Street Fighter",
      "Mortal Kombat",
      "Battlefield",
      "FIFA",
      "Madden NFL",
      "NBA 2K",
      "Halo",
      "Gears of War",
      "Uncharted",
      "God of War",
      "The Witcher",
      "Dark Souls",
      "Dragon Quest",
      "Kingdom Hearts",
      "Persona",
      "Sonic the Hedgehog",
      "Mega Man",
      "Castlevania",
      "Metroid",
      "Donkey Kong",
      "Kirby",
      "Star Fox",
      "Fire Emblem",
      "Xenoblade Chronicles",
      "Mass Effect",
      "Dragon Age",
      "Bioshock",
      "Borderlands",
      "Far Cry",
      "Tom Clancy",
      "Splinter Cell",
      "Ghost Recon",
      "Rainbow Six",
      "Crash Bandicoot",
      "Spyro the Dragon",
      "Ratchet & Clank",
      "Jak and Daxter",
      "Sly Cooper",
      "Little Big Planet",
    ];

    console.log(`[seedPopularFranchises] Starting${dryRun ? " (DRY RUN)" : ""}. ${topFranchises.length} franchises, ${limit} games each`);

    let totalGamesSeeded = 0;
    let franchisesProcessed = 0;
    const results: { franchise: string; gamesAdded: number; error?: string }[] = [];

    for (const franchise of topFranchises) {
      try {
        console.log(`[seedPopularFranchises] Processing franchise: ${franchise}`);

        if (!dryRun) {
          // Use the existing searchOptimizedWithFallback to seed
          // This automatically caches results and updates franchise metadata
          const searchResult = await ctx.runAction(api.igdb.searchOptimizedWithFallback, {
            query: franchise,
            limit,
            minCachedResults: 1, // Always fetch to ensure we get all games
          });

          const gamesAdded = searchResult.results.length;
          totalGamesSeeded += gamesAdded;
          franchisesProcessed++;

          results.push({ franchise, gamesAdded });
          console.log(`[seedPopularFranchises] ✓ ${franchise}: ${gamesAdded} games`);
        } else {
          results.push({ franchise, gamesAdded: 0 });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[seedPopularFranchises] ✗ ${franchise}: ${error}`);
        results.push({ franchise, gamesAdded: 0, error: String(error) });
      }
    }

    console.log(`[seedPopularFranchises] Complete: ${franchisesProcessed}/${topFranchises.length} franchises, ${totalGamesSeeded} total games`);

    const result = {
      success: true,
      franchisesProcessed,
      totalGamesSeeded,
      results,
      timestamp: Date.now(),
    };
    return measureQuerySize(result, "seedPopularFranchises");
  },
});
