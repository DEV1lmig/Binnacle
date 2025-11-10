"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useRouter } from "next/navigation";

type SeedCategory = "trending" | "newReleases" | "topRated";
type LaunchMode = "minimal" | "standard" | "comprehensive" | "custom";

type SeedLimits = Record<SeedCategory, number>;

interface SeedResult {
  success: boolean;
  gamesCached?: number;
  gamesProcessed?: number;
  dryRun?: boolean;
  error?: string;
  timestamp: number;
}

interface BatchSeedResult {
  success: boolean;
  mode?: LaunchMode;
  totalGames?: number;
  durationMinutes?: number;
  durationMs?: number;
  plan?: {
    trending: number;
    topRated: number;
    newReleases: number;
  };
  estimatedGames?: number;
  estimatedTime?: string;
  message?: string;
  error?: string;
  timestamp?: number;
  results?: any[];
  dryRun?: boolean;
}

interface FranchiseSeedResult {
  success: boolean;
  franchisesProcessed?: number;
  totalGamesSeeded?: number;
  error?: string;
  timestamp?: number;
  results?: { franchise: string; gamesAdded: number; error?: string }[];
}

interface SingleSeedResult {
  success: boolean;
  igdbId: number;
  title?: string;
  gamesCached?: number;
  dryRun?: boolean;
  error?: string;
  popularityScore?: number;
  timestamp: number;
  message?: string;
}

interface FlexibleSeedResult extends SeedResult {
  category: SeedCategory;
  requestedLimit: number | null;
  appliedLimit: number;
}

const CATEGORY_LIMIT_CAPS: SeedLimits = {
  trending: 5000,
  newReleases: 5000,
  topRated: 5000,
};

const CATEGORY_LIMIT_MIN: SeedLimits = {
  trending: 10,
  newReleases: 10,
  topRated: 10,
};

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

  // Batch seeding state
  const [batchResult, setBatchResult] = useState<BatchSeedResult | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<LaunchMode>("standard");
  
  // Custom limits state
  const [customLimits, setCustomLimits] = useState<SeedLimits>({
    trending: 1200,
    topRated: 3200,
    newReleases: 600,
  });

  // Individual seeding limits
  const [categoryLimits, setCategoryLimits] = useState<SeedLimits>({
    trending: 1200,
    newReleases: 600,
    topRated: 3200,
  });

  // Franchise seeding state
  const [franchiseResult, setFranchiseResult] = useState<FranchiseSeedResult | null>(null);
  const [franchiseLoading, setFranchiseLoading] = useState(false);
  const [franchiseError, setFranchiseError] = useState<string | null>(null);
  const [franchiseLimit, setFranchiseLimit] = useState(20);

  // Single game seeding state
  const [singleSeedId, setSingleSeedId] = useState("");
  const [singleSeedLoading, setSingleSeedLoading] = useState(false);
  const [singleSeedError, setSingleSeedError] = useState<string | null>(null);
  const [singleSeedResult, setSingleSeedResult] = useState<SingleSeedResult | null>(null);

  // Flexible category seeding state
  const [customCategory, setCustomCategory] = useState<SeedCategory>("trending");
  const [customCategoryLimit, setCustomCategoryLimit] = useState<number>(1200);
  const [customCategoryLoading, setCustomCategoryLoading] = useState(false);
  const [customCategoryError, setCustomCategoryError] = useState<string | null>(null);
  const [customCategoryResult, setCustomCategoryResult] = useState<FlexibleSeedResult | null>(null);

  const seedTrendingGames = useAction(api.igdb.seedTrendingGames);
  const seedNewReleases = useAction(api.igdb.seedNewReleases);
  const seedTopRatedGames = useAction(api.igdb.seedTopRatedGames);
  const seedGamesByCategory = useAction(api.igdb.seedGamesByCategory);
  const seedGameById = useAction(api.igdb.seedGameById);
  const seedForLaunch = useAction(api.seedBatch.seedForLaunch);
  const seedPopularFranchises = useAction(api.seedFranchises.seedPopularFranchises);

  const sanitizeLimitValue = (category: SeedCategory, value: number): number => {
    const min = CATEGORY_LIMIT_MIN[category];
    const max = CATEGORY_LIMIT_CAPS[category];
    if (!Number.isFinite(value)) {
      return min;
    }

    const rounded = Math.floor(value);
    if (rounded <= 0) {
      return min;
    }

    return Math.min(Math.max(rounded, min), max);
  };

  const handleCategoryLimitChange = (category: SeedCategory, rawValue: number) => {
    setCategoryLimits((prev) => ({
      ...prev,
      [category]: Number.isNaN(rawValue) ? prev[category] : rawValue,
    }));
  };

  const handleSeed = async (category: SeedCategory) => {
    try {
      setLoading((prev) => ({ ...prev, [category]: true }));
      setError((prev) => ({ ...prev, [category]: null }));

      const limit = sanitizeLimitValue(category, categoryLimits[category]);
      if (limit !== categoryLimits[category]) {
        setCategoryLimits((prev) => ({ ...prev, [category]: limit }));
      }

      console.log(`[Admin] Triggering seed for ${category}:`, { dryRun: isDryRun, limit });

      let response: SeedResult;
      if (category === "trending") {
        response = await seedTrendingGames({
          limit,
          dryRun: isDryRun,
        });
      } else if (category === "newReleases") {
        response = await seedNewReleases({
          limit,
          dryRun: isDryRun,
        });
      } else {
        response = await seedTopRatedGames({
          limit,
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

  const handleBatchSeed = async () => {
    try {
      setBatchLoading(true);
      setBatchError(null);

      const payload: {
        mode: LaunchMode;
        dryRun: boolean;
        customLimits?: SeedLimits;
      } = {
        mode: selectedMode,
        dryRun: isDryRun,
      };

      if (selectedMode === "custom") {
        const safeLimits: SeedLimits = {
          trending: sanitizeLimitValue("trending", customLimits.trending),
          topRated: sanitizeLimitValue("topRated", customLimits.topRated),
          newReleases: sanitizeLimitValue("newReleases", customLimits.newReleases),
        };
        setCustomLimits(safeLimits);
        payload.customLimits = safeLimits;
        console.log(`[Admin] Triggering batch seed:`, { mode: selectedMode, dryRun: isDryRun, limits: safeLimits });
      } else {
        console.log(`[Admin] Triggering batch seed:`, { mode: selectedMode, dryRun: isDryRun });
      }

      const response = await seedForLaunch(payload);

      console.log(`[Admin] Batch seed result:`, response);
      setBatchResult(response);

      if (!response.success && 'error' in response) {
        setBatchError(response.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Admin] Batch seed failed:`, err);
      setBatchError(errorMessage);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFranchiseSeed = async () => {
    try {
      setFranchiseLoading(true);
      setFranchiseError(null);

      console.log(`[Admin] Triggering franchise seed:`, { limit: franchiseLimit, dryRun: isDryRun });

      const response = await seedPopularFranchises({
        limit: franchiseLimit,
        dryRun: isDryRun,
      });

      console.log(`[Admin] Franchise seed result:`, response);
      setFranchiseResult(response);

      if (!response.success) {
        // Check if error exists in the response structure
        const errorMsg = 'error' in response ? (response as any).error : "Unknown error";
        setFranchiseError(errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Admin] Franchise seed failed:`, err);
      setFranchiseError(errorMessage);
    } finally {
      setFranchiseLoading(false);
    }
  };

  const handleSingleGameSeed = async () => {
    const trimmed = singleSeedId.trim();
    if (!trimmed) {
      setSingleSeedError("Enter an IGDB game ID to seed.");
      return;
    }

    const parsedId = Number(trimmed);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      setSingleSeedError("Provide a valid numeric IGDB game ID.");
      return;
    }

    const igdbId = Math.floor(parsedId);

    try {
      setSingleSeedLoading(true);
      setSingleSeedError(null);

      console.log(`[Admin] Triggering single game seed:`, { igdbId, dryRun: isDryRun });

      const response = await seedGameById({
        igdbId,
        dryRun: isDryRun,
      });

      setSingleSeedResult(response);

      if (!response.success) {
        setSingleSeedError(response.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Admin] Single game seed failed:`, err);
      setSingleSeedError(errorMessage);
    } finally {
      setSingleSeedLoading(false);
    }
  };

  useEffect(() => {
    setCustomCategoryLimit((prev) => sanitizeLimitValue(customCategory, categoryLimits[customCategory] ?? prev));
  }, [customCategory, categoryLimits]);

  const handleFlexibleCategorySeed = async () => {
    const limit = sanitizeLimitValue(customCategory, customCategoryLimit);
    if (limit !== customCategoryLimit) {
      setCustomCategoryLimit(limit);
    }

    try {
      setCustomCategoryLoading(true);
      setCustomCategoryError(null);

      console.log(`[Admin] Triggering flexible seed:`, { category: customCategory, limit, dryRun: isDryRun });

      const response = (await seedGamesByCategory({
        category: customCategory,
        limit,
        dryRun: isDryRun,
      })) as FlexibleSeedResult;

      setCustomCategoryResult(response);

      if (!response.success) {
        setCustomCategoryError(response.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Admin] Flexible seed failed:`, err);
      setCustomCategoryError(errorMessage);
    } finally {
      setCustomCategoryLoading(false);
    }
  };

  const sanitizedCustomPreview: SeedLimits = {
    trending: sanitizeLimitValue("trending", customLimits.trending),
    newReleases: sanitizeLimitValue("newReleases", customLimits.newReleases),
    topRated: sanitizeLimitValue("topRated", customLimits.topRated),
  };

  const estimatedCustomTotal = Math.floor(
    (sanitizedCustomPreview.trending + sanitizedCustomPreview.topRated + sanitizedCustomPreview.newReleases) * 0.7
  );

  const isAnyCategorySeeding = Object.values(loading).some(Boolean);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage cache and system tasks</p>
        </div>

        {/* Quick Launch Seeding - Batch Mode */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Quick Launch Seeding
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">RECOMMENDED</span>
            </CardTitle>
            <CardDescription>
              Fast-track database population with optimized batch seeding. Perfect for launch or testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg text-sm space-y-2">
              <p>
                <strong>Smart Batch Seeding:</strong> Seeds multiple categories in one operation
              </p>
              <p>
                <strong>Modes:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Minimal:</strong> ~1,500 games, ~15 minutes (quick testing/soft launch)</li>
                <li><strong>Standard:</strong> ~5,000 games, 45-60 minutes (recommended for production)</li>
                <li><strong>Comprehensive:</strong> ~8,000+ games, 90-120 minutes (full library)</li>
              </ul>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Mode:</label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={selectedMode === "minimal" ? "default" : "outline"}
                  onClick={() => setSelectedMode("minimal")}
                  disabled={batchLoading}
                  size="sm"
                >
                  Minimal
                </Button>
                <Button
                  variant={selectedMode === "standard" ? "default" : "outline"}
                  onClick={() => setSelectedMode("standard")}
                  disabled={batchLoading}
                  size="sm"
                >
                  Standard ⭐
                </Button>
                <Button
                  variant={selectedMode === "comprehensive" ? "default" : "outline"}
                  onClick={() => setSelectedMode("comprehensive")}
                  disabled={batchLoading}
                  size="sm"
                >
                  Comprehensive
                </Button>
                <Button
                  variant={selectedMode === "custom" ? "default" : "outline"}
                  onClick={() => setSelectedMode("custom")}
                  disabled={batchLoading}
                  size="sm"
                >
                  Custom
                </Button>
              </div>
            </div>

            {/* Custom Limits Input - Only shown when Custom mode selected */}
            {selectedMode === "custom" && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold">Custom Limits:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Trending Games</label>
                    <input
                      type="number"
                      value={customLimits.trending}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, trending: Number(e.target.value) }))}
                      onBlur={(e) => setCustomLimits((prev) => ({ ...prev, trending: sanitizeLimitValue("trending", Number(e.target.value)) }))}
                      disabled={batchLoading}
                      min={10}
                      max={1000}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Top Rated Games</label>
                    <input
                      type="number"
                      value={customLimits.topRated}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, topRated: Number(e.target.value) }))}
                      onBlur={(e) => setCustomLimits((prev) => ({ ...prev, topRated: sanitizeLimitValue("topRated", Number(e.target.value)) }))}
                      disabled={batchLoading}
                      min={10}
                      max={5000}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">New Releases</label>
                    <input
                      type="number"
                      value={customLimits.newReleases}
                      onChange={(e) => setCustomLimits(prev => ({ ...prev, newReleases: Number(e.target.value) }))}
                      onBlur={(e) => setCustomLimits((prev) => ({ ...prev, newReleases: sanitizeLimitValue("newReleases", Number(e.target.value)) }))}
                      disabled={batchLoading}
                      min={10}
                      max={1000}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated total: ~{estimatedCustomTotal.toLocaleString()} games (accounting for duplicates)
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Limits clamp between {CATEGORY_LIMIT_MIN.trending}-{CATEGORY_LIMIT_CAPS.trending} for Trending/New Releases and {CATEGORY_LIMIT_MIN.topRated}-{CATEGORY_LIMIT_CAPS.topRated} for Top Rated
                </p>
              </div>
            )}

            {/* Run Button */}
            <Button
              onClick={handleBatchSeed}
              disabled={batchLoading}
              size="lg"
              className="w-full"
            >
              {batchLoading 
                ? "Seeding..." 
                : selectedMode === "custom"
                  ? "Run Custom Batch Seed"
                  : `Run ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Batch Seed`
              }
            </Button>

            {/* Error Display */}
            {batchError && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded">
                {batchError}
              </div>
            )}

            {/* Results Display */}
            {batchResult && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                {batchResult.success ? (
                  <>
                    <p className="font-semibold text-green-600 text-lg">✓ Success</p>
                    {batchResult.dryRun ? (
                      <>
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold">Dry Run Preview:</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-background p-2 rounded">
                              <p className="text-xs text-muted-foreground">Trending</p>
                              <p className="font-semibold">{batchResult.plan?.trending}</p>
                            </div>
                            <div className="bg-background p-2 rounded">
                              <p className="text-xs text-muted-foreground">Top Rated</p>
                              <p className="font-semibold">{batchResult.plan?.topRated}</p>
                            </div>
                            <div className="bg-background p-2 rounded">
                              <p className="text-xs text-muted-foreground">New Releases</p>
                              <p className="font-semibold">{batchResult.plan?.newReleases}</p>
                            </div>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span>Estimated Games:</span>
                            <span className="font-semibold">{batchResult.estimatedGames?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Estimated Time:</span>
                            <span className="font-semibold">{batchResult.estimatedTime}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground italic text-sm pt-2">
                          {batchResult.message || "DRY RUN - no changes made"}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Games Seeded</p>
                            <p className="text-2xl font-bold">{batchResult.totalGames?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="text-2xl font-bold">{batchResult.durationMinutes?.toFixed(1)} min</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs pt-2">
                          Completed at {batchResult.timestamp ? new Date(batchResult.timestamp).toLocaleTimeString() : 'Unknown time'}
                        </p>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-destructive">Failed: {batchResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Franchise Seeding */}
        <Card>
          <CardHeader>
            <CardTitle>🎮 Popular Franchise Seeding</CardTitle>
            <CardDescription>
              Seed entire franchises (Mario, Zelda, Final Fantasy, etc.) for optimal franchise-aware search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p>
                <strong>What it does:</strong> Seeds top 50 popular franchises with configurable games per franchise
              </p>
              <p>
                <strong>Franchises included:</strong> Mario, Zelda, Pokemon, Final Fantasy, Call of Duty, GTA, Halo, and 43 more
              </p>
              <p>
                <strong>Estimated time:</strong> ~30-45 minutes for 20 games per franchise (~1500 total games)
              </p>
              <p>
                <strong>Best for:</strong> Ensuring franchise detection works perfectly for major series
              </p>
            </div>

            {/* Games per franchise input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Games per franchise:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={franchiseLimit}
                  onChange={(e) => setFranchiseLimit(Number(e.target.value))}
                  disabled={franchiseLoading}
                  min={5}
                  max={50}
                  className="flex-1 px-3 py-2 border border-border rounded-md"
                />
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    onClick={() => setFranchiseLimit(10)}
                    disabled={franchiseLoading}
                    size="sm"
                  >
                    10
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFranchiseLimit(20)}
                    disabled={franchiseLoading}
                    size="sm"
                  >
                    20
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFranchiseLimit(30)}
                    disabled={franchiseLoading}
                    size="sm"
                  >
                    30
                  </Button>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <Button
              onClick={handleFranchiseSeed}
              disabled={franchiseLoading}
              size="lg"
              className="w-full"
            >
              {franchiseLoading ? "Seeding Franchises..." : "Seed Popular Franchises"}
            </Button>

            {/* Error Display */}
            {franchiseError && (
              <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded">
                {franchiseError}
              </div>
            )}

            {/* Results Display */}
            {franchiseResult && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                {franchiseResult.success ? (
                  <>
                    <p className="font-semibold text-green-600 text-lg">✓ Success</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Franchises Processed</p>
                        <p className="text-2xl font-bold">{franchiseResult.franchisesProcessed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Games Seeded</p>
                        <p className="text-2xl font-bold">{franchiseResult.totalGamesSeeded?.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs pt-2">
                      Completed at {franchiseResult.timestamp ? new Date(franchiseResult.timestamp).toLocaleTimeString() : 'Unknown time'}
                    </p>
                  </>
                ) : (
                  <p className="text-destructive">Failed: {franchiseResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase 3 Seeding - Individual Seed Functions */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Category Seeding</CardTitle>
            <CardDescription>
              Seed games by individual category with optimized queries. Use for fine-grained control or scheduled updates.
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
                <strong>Expected Result:</strong> ~500-5,000 games per category (configurable)
              </p>
              <p>
                <strong>Time:</strong> 2-10 minutes per category (dependent on IGDB rate limits)
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
                  disabled={isAnyCategorySeeding}
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
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Games to fetch</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={categoryLimits.trending}
                      onChange={(e) => handleCategoryLimitChange("trending", Number(e.target.value))}
                      onBlur={(e) => setCategoryLimits((prev) => ({ ...prev, trending: sanitizeLimitValue("trending", Number(e.target.value)) }))}
                      disabled={isAnyCategorySeeding}
                      min={CATEGORY_LIMIT_MIN.trending}
                      max={CATEGORY_LIMIT_CAPS.trending}
                      className="flex-1 px-3 py-2 border border-border rounded-md"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, trending: sanitizeLimitValue("trending", 600) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        600
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, trending: sanitizeLimitValue("trending", 1200) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        1.2k
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, trending: sanitizeLimitValue("trending", 2000) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        2k
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleSeed("trending")}
                  disabled={isAnyCategorySeeding}
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
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Games to fetch</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={categoryLimits.newReleases}
                      onChange={(e) => handleCategoryLimitChange("newReleases", Number(e.target.value))}
                      onBlur={(e) => setCategoryLimits((prev) => ({ ...prev, newReleases: sanitizeLimitValue("newReleases", Number(e.target.value)) }))}
                      disabled={isAnyCategorySeeding}
                      min={CATEGORY_LIMIT_MIN.newReleases}
                      max={CATEGORY_LIMIT_CAPS.newReleases}
                      className="flex-1 px-3 py-2 border border-border rounded-md"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, newReleases: sanitizeLimitValue("newReleases", 300) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        300
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, newReleases: sanitizeLimitValue("newReleases", 600) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        600
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, newReleases: sanitizeLimitValue("newReleases", 1000) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        1k
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleSeed("newReleases")}
                  disabled={isAnyCategorySeeding}
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
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Games to fetch</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={categoryLimits.topRated}
                      onChange={(e) => handleCategoryLimitChange("topRated", Number(e.target.value))}
                      onBlur={(e) => setCategoryLimits((prev) => ({ ...prev, topRated: sanitizeLimitValue("topRated", Number(e.target.value)) }))}
                      disabled={isAnyCategorySeeding}
                      min={CATEGORY_LIMIT_MIN.topRated}
                      max={CATEGORY_LIMIT_CAPS.topRated}
                      className="flex-1 px-3 py-2 border border-border rounded-md"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, topRated: sanitizeLimitValue("topRated", 1500) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        1.5k
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, topRated: sanitizeLimitValue("topRated", 3200) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        3.2k
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryLimits((prev) => ({ ...prev, topRated: sanitizeLimitValue("topRated", 4500) }))}
                        disabled={isAnyCategorySeeding}
                      >
                        4.5k
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleSeed("topRated")}
                  disabled={isAnyCategorySeeding}
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

            {/* Flexible Category Seeding */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-semibold">Flexible Category Seeding</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose any category and cache exactly the number of games you need.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as SeedCategory)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    disabled={customCategoryLoading}
                  >
                    <option value="trending">Trending</option>
                    <option value="newReleases">New Releases</option>
                    <option value="topRated">Top Rated</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Games to fetch</label>
                  <input
                    type="number"
                    value={customCategoryLimit}
                    onChange={(e) => setCustomCategoryLimit(Number(e.target.value))}
                    onBlur={(e) => setCustomCategoryLimit(sanitizeLimitValue(customCategory, Number(e.target.value)))}
                    disabled={customCategoryLoading}
                    min={CATEGORY_LIMIT_MIN[customCategory]}
                    max={CATEGORY_LIMIT_CAPS[customCategory]}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Range: {CATEGORY_LIMIT_MIN[customCategory]} - {CATEGORY_LIMIT_CAPS[customCategory]}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleFlexibleCategorySeed}
                disabled={customCategoryLoading}
                size="sm"
                className="w-full md:w-auto"
              >
                {customCategoryLoading ? "Seeding..." : `Seed ${customCategory === "newReleases" ? "New Releases" : customCategory === "topRated" ? "Top Rated" : "Trending"}`}
              </Button>
              {customCategoryError && (
                <div className="bg-destructive/10 border border-destructive text-destructive p-2 rounded text-xs">
                  {customCategoryError}
                </div>
              )}
              {customCategoryResult && (
                <div className="bg-muted p-3 rounded text-xs space-y-1">
                  {customCategoryResult.success ? (
                    <>
                      <p className="font-semibold text-green-600">✓ {customCategoryResult.dryRun ? "Dry Run Preview" : "Seeding Complete"}</p>
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <span className="font-semibold capitalize">{customCategoryResult.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Requested Limit:</span>
                        <span className="font-semibold">{customCategoryResult.requestedLimit ?? "default"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Applied Limit:</span>
                        <span className="font-semibold">{customCategoryResult.appliedLimit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Games Cached:</span>
                        <span className="font-semibold">{customCategoryResult.gamesCached?.toLocaleString() ?? "0"}</span>
                      </div>
                      {customCategoryResult.dryRun && (
                        <p className="text-muted-foreground italic">DRY RUN - no changes made</p>
                      )}
                      <p className="text-muted-foreground text-[10px]">
                        Completed at {new Date(customCategoryResult.timestamp).toLocaleTimeString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-destructive">Failed: {customCategoryResult.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Seed Specific Game */}
            <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Seed Specific Game</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter an IGDB game ID to cache a single title (great for quick fixes or playtests)
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Manual</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">IGDB Game ID</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={singleSeedId}
                    onChange={(e) => setSingleSeedId(e.target.value)}
                    placeholder="e.g. 1234"
                    min={1}
                    className="flex-1 px-3 py-2 border border-border rounded-md"
                    disabled={singleSeedLoading}
                  />
                  <Button
                    onClick={handleSingleGameSeed}
                    disabled={singleSeedLoading || singleSeedId.trim().length === 0}
                    size="sm"
                  >
                    {singleSeedLoading ? "Seeding..." : "Seed Game"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  IGDB IDs are visible in the URL: <code className="bg-muted px-1 py-0.5 rounded">https://www.igdb.com/games/<span className="text-muted-foreground">{`<slug>`}</span></code>
                </p>
              </div>

              {singleSeedError && (
                <div className="bg-destructive/10 border border-destructive text-destructive p-2 rounded text-xs">
                  {singleSeedError}
                </div>
              )}

              {singleSeedResult && (
                <div className="bg-muted p-3 rounded text-xs space-y-1">
                  {singleSeedResult.success ? (
                    <>
                      <p className="font-semibold text-green-600">✓ {singleSeedResult.dryRun ? "Dry Run Preview" : "Game Cached"}</p>
                      <div className="flex justify-between">
                        <span>IGDB ID:</span>
                        <span className="font-semibold">{singleSeedResult.igdbId}</span>
                      </div>
                      {singleSeedResult.title && (
                        <div className="flex justify-between">
                          <span>Title:</span>
                          <span className="font-semibold text-right max-w-[220px] truncate">{singleSeedResult.title}</span>
                        </div>
                      )}
                      {!singleSeedResult.dryRun && (
                        <div className="flex justify-between">
                          <span>Games Cached:</span>
                          <span className="font-semibold">{singleSeedResult.gamesCached ?? 1}</span>
                        </div>
                      )}
                      {typeof singleSeedResult.popularityScore === "number" && !singleSeedResult.dryRun && (
                        <div className="flex justify-between">
                          <span>PopScore:</span>
                          <span className="font-semibold">{singleSeedResult.popularityScore.toFixed(2)}</span>
                        </div>
                      )}
                      <p className="text-muted-foreground text-[10px]">
                        {singleSeedResult.dryRun ? singleSeedResult.message : "Cache updated successfully."}
                      </p>
                    </>
                  ) : (
                    <p className="text-destructive">Failed: {singleSeedResult.error}</p>
                  )}
                  <p className="text-muted-foreground text-[10px] pt-1">
                    {new Date(singleSeedResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
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
