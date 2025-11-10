import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get approximate database bandwidth usage statistics.
 * This measures the size of data read from queries.
 */
export const getBandwidthStats = query({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    
    // Get all tables and count documents/estimate size
    const stats = {
      tables: [] as Array<{
        name: string;
        documentCount: number;
        estimatedSizeKB: number;
      }>,
      totalDocuments: 0,
      totalEstimatedSizeKB: 0,
      queryTime: 0,
    };

    // Sample each table to estimate bandwidth
    const tableNames = ['games', 'users', 'reviews', 'backlogItems', 'followers', 'likes'];
    
    for (const tableName of tableNames) {
      try {
        const documents = await ctx.db.query(tableName as any).collect();
        const documentCount = documents.length;
        
        // Estimate size by converting to JSON and measuring
        const jsonSize = JSON.stringify(documents).length;
        const estimatedSizeKB = Math.round(jsonSize / 1024);
        
        stats.tables.push({
          name: tableName,
          documentCount,
          estimatedSizeKB,
        });
        
        stats.totalDocuments += documentCount;
        stats.totalEstimatedSizeKB += estimatedSizeKB;
      } catch (error) {
        console.log(`Table ${tableName} might not exist or is empty`);
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
    const startTime = Date.now();
    
    const query = args.limit 
      ? ctx.db.query(args.tableName as any).take(args.limit)
      : ctx.db.query(args.tableName as any).collect();
    
    const results = await query;
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
export const getDatabaseSize = query({
  args: {},
  handler: async (ctx) => {
    const tables = {
      games: await ctx.db.query("games").collect(),
      users: await ctx.db.query("users").collect(),
      reviews: await ctx.db.query("reviews").collect(),
      backlogItems: await ctx.db.query("backlogItems").collect(),
      followers: await ctx.db.query("followers").collect(),
      likes: await ctx.db.query("likes").collect(),
    };

    const tableSizes = Object.entries(tables).map(([name, docs]) => ({
      table: name,
      count: docs.length,
      sizeKB: Math.round(JSON.stringify(docs).length / 1024),
    }));

    const totalSize = tableSizes.reduce((sum, t) => sum + t.sizeKB, 0);
    const totalDocs = tableSizes.reduce((sum, t) => sum + t.count, 0);

    return {
      tables: tableSizes,
      totals: {
        documents: totalDocs,
        sizeKB: totalSize,
        sizeMB: (totalSize / 1024).toFixed(2),
      },
    };
  },
});
