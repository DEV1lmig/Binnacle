import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * PHASE 2B Data Migration: Remove unused fields from existing game documents
 * 
 * This migration cleans up existing data to match the new optimized schema.
 * Removed fields: artworks, screenshots, videos, websites, languageSupports, multiplayerModes, dlcsAndExpansions
 * 
 * Run this ONCE before deploying Phase 2B to production.
 * Usage: npx convex run migrations:cleanupGameFields
 */
export const cleanupGameFields = mutation({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").collect();
    
    let cleaned = 0;
    let errors = 0;
    
    for (const game of games) {
      try {
        // Check if document has any of the removed fields
        const hasRemovedFields = 
          (game as any).artworks !== undefined ||
          (game as any).screenshots !== undefined ||
          (game as any).videos !== undefined ||
          (game as any).websites !== undefined ||
          (game as any).languageSupports !== undefined ||
          (game as any).multiplayerModes !== undefined ||
          (game as any).dlcsAndExpansions !== undefined ||
          (game as any).similarGames !== undefined;
        
        if (hasRemovedFields) {
          // Create a new object with only valid fields (schema will validate)
          const cleanedGame = {
            ageRatings: (game as any).ageRatings,
            aggregatedRating: (game as any).aggregatedRating,
            aggregatedRatingCount: (game as any).aggregatedRatingCount,
            category: (game as any).category,
            coverUrl: (game as any).coverUrl,
            developers: (game as any).developers,
            firstReleaseDate: (game as any).firstReleaseDate,
            franchise: (game as any).franchise,
            franchises: (game as any).franchises,
            gameModes: (game as any).gameModes,
            gameStatus: (game as any).gameStatus,
            gameType: (game as any).gameType,
            genres: (game as any).genres,
            hypes: (game as any).hypes,
            igdbId: (game as any).igdbId,
            lastUpdated: Date.now(),
            parentGame: (game as any).parentGame,
            platforms: (game as any).platforms,
            playerPerspectives: (game as any).playerPerspectives,
            popularity_score: (game as any).popularity_score,
            publishers: (game as any).publishers,
            rating: (game as any).rating,
            ratingCount: (game as any).ratingCount,
            releaseYear: (game as any).releaseYear,
            storyline: (game as any).storyline,
            summary: (game as any).summary,
            themes: (game as any).themes,
            title: (game as any).title,
            totalRating: (game as any).totalRating,
            totalRatingCount: (game as any).totalRatingCount,
          };
          
          // Patch the document to remove old fields and update timestamp
          await ctx.db.patch(game._id, cleanedGame);
          cleaned++;
        }
      } catch (error) {
        console.error(`Failed to clean game ${game._id}:`, error);
        errors++;
      }
    }
    
    return {
      total: games.length,
      cleaned,
      errors,
      message: `Migration complete: Cleaned ${cleaned} documents with ${errors} errors out of ${games.length} total games`,
    };
  },
});

/**
 * Alternative: More aggressive cleanup that directly removes the fields
 * Use this if the above approach doesn't work due to schema validation
 * This requires direct database access without schema validation
 */
export const cleanupGameFieldsDirect = mutation({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").collect();
    
    let cleaned = 0;
    
    for (const game of games) {
      // Fields to remove
      const fieldsToRemove = [
        "artworks",
        "screenshots", 
        "videos",
        "websites",
        "languageSupports",
        "multiplayerModes",
        "dlcsAndExpansions",
        "similarGames",
      ];
      
      // Only patch if document has any of these fields
      const hasRemovedFields = fieldsToRemove.some(field => (game as any)[field] !== undefined);
      
      if (hasRemovedFields) {
        // Create patch object that removes the fields by not including them
        const patchObj: Record<string, any> = {
          lastUpdated: Date.now(),
        };
        
        await ctx.db.patch(game._id, patchObj);
        cleaned++;
      }
    }
    
    return {
      total: games.length,
      cleaned,
      message: `Direct cleanup complete: Updated ${cleaned} documents to remove schema violations`,
    };
  },
});
