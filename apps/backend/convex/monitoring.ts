import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

/**
 * Get approximate database bandwidth usage statistics.
 * This measures the size of data read from queries.
 */
export const getBandwidthStats = internalQuery({
  args: {
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const startTime = Date.now();

    const sampleSize = Math.min(Math.max(1, args.sampleSize ?? 100), 1000);

    const stats = {
      tables: [] as Array<{
        name: string;
        sampledDocuments: number;
        sampledSizeKB: number;
      }>,
      sampleSize,
      queryTime: 0,
    };

    const tableNames = ["games", "users", "reviews", "backlogItems", "followers", "likes"] as const;

    for (const tableName of tableNames) {
      try {
        const documents = await ctx.db.query(tableName).take(sampleSize);
        const jsonSize = JSON.stringify(documents).length;
        stats.tables.push({
          name: tableName,
          sampledDocuments: documents.length,
          sampledSizeKB: Math.round(jsonSize / 1024),
        });
      } catch {
        // Ignore missing tables (or unexpected issues) in this diagnostic endpoint.
      }
    }

    stats.queryTime = Date.now() - startTime;
    return stats;
  },
});

/**
 * Test a specific query and measure its bandwidth usage.
 */
export const measureQueryBandwidth = internalQuery({
  args: {
    tableName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const startTime = Date.now();

    const limit = Math.min(Math.max(1, args.limit ?? 100), 5000);
    const results = await ctx.db.query(args.tableName as any).take(limit);
    const jsonSize = JSON.stringify(results).length;
    
    return {
      tableName: args.tableName,
      documentsReturned: results.length,
      sizeBytes: jsonSize,
      sizeKB: Math.round(jsonSize / 1024),
      sizeMB: (jsonSize / (1024 * 1024)).toFixed(2),
      queryTimeMs: Date.now() - startTime,
      estimatedBandwidthPerDoc: results.length > 0 ? Math.round(jsonSize / results.length) : 0,
    };
  },
});

/**
 * Get current database size and document counts.
 */
export const getDatabaseSize = internalQuery({
  args: {
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const sampleSize = Math.min(Math.max(1, args.sampleSize ?? 200), 2000);
    const tableNames = ["games", "users", "reviews", "backlogItems", "followers", "likes"] as const;

    const tableSizes = await Promise.all(
      tableNames.map(async (table) => {
        const docs = await ctx.db.query(table).take(sampleSize);
        return {
          table,
          sampledCount: docs.length,
          sampledSizeKB: Math.round(JSON.stringify(docs).length / 1024),
        };
      })
    );

    const totalSampledSizeKB = tableSizes.reduce((sum, t) => sum + t.sampledSizeKB, 0);
    const totalSampledDocs = tableSizes.reduce((sum, t) => sum + t.sampledCount, 0);

    return {
      sampleSize,
      tables: tableSizes,
      totals: {
        sampledDocuments: totalSampledDocs,
        sampledSizeKB: totalSampledSizeKB,
        sampledSizeMB: (totalSampledSizeKB / 1024).toFixed(2),
      },
    };
  },
});
