"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useRouter } from "next/navigation";

type SeedCategory = "trending" | "newReleases" | "topRated";

interface SeedResult {
  success: boolean;
  gamesCached?: number;
  gamesProcessed?: number;
  dryRun?: boolean;
  error?: string;
  timestamp: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [isDryRun, setIsDryRun] = useState(false);
  const [results, setResults] = useState<Record<SeedCategory, SeedResult | null>>({
    trending: null,
    newReleases: null,
    topRated: null,
  });
  const [loading, setLoading] = useState<Record<SeedCategory, boolean>>({
    trending: false,
    newReleases: false,
    topRated: false,
  });
  const [error, setError] = useState<Record<SeedCategory, string | null>>({
    trending: null,
    newReleases: null,
    topRated: null,
  });

  const seedTrendingGames = useAction(api.igdb.seedTrendingGames);
  const seedNewReleases = useAction(api.igdb.seedNewReleases);
  const seedTopRatedGames = useAction(api.igdb.seedTopRatedGames);

  const handleSeed = async (category: SeedCategory) => {
    try {
      setLoading((prev) => ({ ...prev, [category]: true }));
      setError((prev) => ({ ...prev, [category]: null }));

      console.log(`[Admin] Triggering seed for ${category}:`, { dryRun: isDryRun });

      let response: SeedResult;
      if (category === "trending") {
        response = await seedTrendingGames({
          limit: 100,
          dryRun: isDryRun,
        });
      } else if (category === "newReleases") {
        response = await seedNewReleases({
          limit: 100,
          dryRun: isDryRun,
        });
      } else {
        response = await seedTopRatedGames({
          limit: 100,
          dryRun: isDryRun,
        });
      }

      console.log(`[Admin] ${category} seed result:`, response);
      setResults((prev) => ({ ...prev, [category]: response }));

      if (!response.success) {
        setError((prev) => ({
          ...prev,
          [category]: response.error || "Unknown error",
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Admin] ${category} seed failed:`, err);
      setError((prev) => ({ ...prev, [category]: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage cache and system tasks</p>
        </div>

        {/* Phase 3 Seeding - Individual Seed Functions */}
        <Card>
          <CardHeader>
            <CardTitle>Phase 3: Optimized Game Seeding</CardTitle>
            <CardDescription>
              Seed games by category with optimized queries. Each function independently caches games
              in its category (trending, new releases, top-rated).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p>
                <strong>Architecture:</strong> 3 independent seed functions with optimized IGDB queries
              </p>
              <p>
                <strong>API Cost:</strong> Minimal (1 API call per function)
              </p>
              <p>
                <strong>Expected Result:</strong> 100-500 games per category (configurable)
              </p>
              <p>
                <strong>Time:</strong> 10-30 seconds per category
              </p>
              <p>
                <strong>Recommendation:</strong> Run trending daily, new releases weekly, top-rated monthly
              </p>
            </div>

            {/* Dry Run Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  disabled={Object.values(loading).some((v) => v)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Dry Run (preview without caching)</span>
              </label>
            </div>

            {/* Three Seed Function Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Trending Games */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-semibold">Trending Games</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Released games with 50+ engagement ratings
                  </p>
                </div>
                <Button
                  onClick={() => handleSeed("trending")}
                  disabled={loading.trending || Object.values(loading).some((v) => v)}
                  size="sm"
                  className="w-full"
                >
                  {loading.trending ? "Seeding..." : "Seed Trending"}
                </Button>
                {error.trending && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-2 rounded text-xs">
                    {error.trending}
                  </div>
                )}
                {results.trending && (
                  <div className="bg-muted p-2 rounded text-xs space-y-1">
                    {results.trending.success ? (
                      <>
                        <p className="font-semibold text-green-600">✓ Success</p>
                        <div className="flex justify-between">
                          <span>Games Cached:</span>
                          <span className="font-semibold">
                            {results.trending.gamesCached?.toLocaleString()}
                          </span>
                        </div>
                        {results.trending.dryRun && (
                          <p className="text-muted-foreground italic">DRY RUN - no changes made</p>
                        )}
                        <p className="text-muted-foreground text-xs pt-1">
                          {new Date(results.trending.timestamp).toLocaleTimeString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-destructive">Failed: {results.trending.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* New Releases */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-semibold">New Releases</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Games released in the past 12 months
                  </p>
                </div>
                <Button
                  onClick={() => handleSeed("newReleases")}
                  disabled={loading.newReleases || Object.values(loading).some((v) => v)}
                  size="sm"
                  className="w-full"
                >
                  {loading.newReleases ? "Seeding..." : "Seed New Releases"}
                </Button>
                {error.newReleases && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-2 rounded text-xs">
                    {error.newReleases}
                  </div>
                )}
                {results.newReleases && (
                  <div className="bg-muted p-2 rounded text-xs space-y-1">
                    {results.newReleases.success ? (
                      <>
                        <p className="font-semibold text-green-600">✓ Success</p>
                        <div className="flex justify-between">
                          <span>Games Cached:</span>
                          <span className="font-semibold">
                            {results.newReleases.gamesCached?.toLocaleString()}
                          </span>
                        </div>
                        {results.newReleases.dryRun && (
                          <p className="text-muted-foreground italic">DRY RUN - no changes made</p>
                        )}
                        <p className="text-muted-foreground text-xs pt-1">
                          {new Date(results.newReleases.timestamp).toLocaleTimeString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-destructive">Failed: {results.newReleases.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Top Rated */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-semibold">Top Rated Games</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Games with 75+ critic rating & 5+ reviews
                  </p>
                </div>
                <Button
                  onClick={() => handleSeed("topRated")}
                  disabled={loading.topRated || Object.values(loading).some((v) => v)}
                  size="sm"
                  className="w-full"
                >
                  {loading.topRated ? "Seeding..." : "Seed Top Rated"}
                </Button>
                {error.topRated && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-2 rounded text-xs">
                    {error.topRated}
                  </div>
                )}
                {results.topRated && (
                  <div className="bg-muted p-2 rounded text-xs space-y-1">
                    {results.topRated.success ? (
                      <>
                        <p className="font-semibold text-green-600">✓ Success</p>
                        <div className="flex justify-between">
                          <span>Games Cached:</span>
                          <span className="font-semibold">
                            {results.topRated.gamesCached?.toLocaleString()}
                          </span>
                        </div>
                        {results.topRated.dryRun && (
                          <p className="text-muted-foreground italic">DRY RUN - no changes made</p>
                        )}
                        <p className="text-muted-foreground text-xs pt-1">
                          {new Date(results.topRated.timestamp).toLocaleTimeString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-destructive">Failed: {results.topRated.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Job Info */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Seeding</CardTitle>
            <CardDescription>Automate cache population</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p>
                <strong>Status:</strong> Ready to implement
              </p>
              <p className="text-muted-foreground">
                Scheduled jobs will automatically seed games in each category on different schedules:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>Trending: Daily at midnight UTC</li>
                <li>New Releases: Weekly on Monday at midnight UTC</li>
                <li>Top Rated: Monthly on the 1st at midnight UTC</li>
              </ul>
              <p className="text-muted-foreground pt-2">
                For now, use the buttons above to manually trigger as needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-full"
        >
          Back
        </Button>
      </div>
    </div>
  );
}
