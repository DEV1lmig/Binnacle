/**
 * QueryCache - In-memory caching layer for Convex queries
 * Reduces database reads by caching frequently accessed data
 * 
 * Usage:
 *   const cached = queryCache.get("games:action:20");
 *   if (cached) return cached;
 *   
 *   const results = await ctx.db.query("games").collect();
 *   queryCache.set("games:action:20", results, 30 * 60 * 1000); // 30 min TTL
 *   return results;
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
};

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  /**
   * Store value in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  /**
   * Invalidate cache entries matching a pattern
   * Useful for invalidating related caches when data changes
   */
  invalidate(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      totalRequests,
      hitRate: hitRate.toFixed(2) + "%",
      cacheSize: this.cache.size,
    };
  }

  /**
   * Reset statistics (useful after initial warmup)
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

/**
 * Helper function to generate cache keys consistently
 * Example: cacheKey("games", "action", 20) => "games:action:20"
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}
