"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard } from "@/app/components/GameCard";
import { AdSpace } from "@/app/components/AdSpace";
import { FeedReviewList, type FeedReviewEntry } from "./components/FeedReviewList";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { TrendingUp, ArrowRight, Users } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

type ActivityTab = "community" | "friends";

export default function FeedPage() {
  const router = useRouter();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [activityTab, setActivityTab] = useState<ActivityTab>("community");

  // Fetch feed data from Convex - skip timeline query until user profile is synced
  // This prevents the "User profile not found" error during initial login when
  // Clerk auth completes but Convex user record hasn't synced yet
  const feedTimeline = useQuery(
    api.feed.timeline,
    currentUser ? { limit: 30 } : "skip"
  );
  const discoverPeople = useQuery(api.users.search, { query: "", limit: 50 });

  const communityEntries = (feedTimeline?.community ?? []) as FeedReviewEntry[];
  const friendEntries = (feedTimeline?.friends ?? []) as FeedReviewEntry[];
  const activityEntries = activityTab === "friends" ? friendEntries : communityEntries;
  const peopleToDisplay = (discoverPeople || []).filter((user) => !currentUser || user._id !== currentUser._id).slice(0, 5);

  // Get popular games from recent activity (top rated/most reviewed)
  const popularGames = communityEntries
    .slice(0, 5)
    .map((entry) => entry.game)
    .filter((game, index, self) => self.findIndex((g) => g._id === game._id) === index);

  // Show skeleton while user data is loading
  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  const isLoading = feedTimeline === undefined;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1
            className="text-[var(--bkl-color-text-primary)] mb-2"
            style={{ fontSize: "var(--bkl-font-size-4xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
          >
            Welcome back, {currentUser.name}
          </h1>
          <p
            className="text-[var(--bkl-color-text-secondary)]"
            style={{ fontSize: "var(--bkl-font-size-base)" }}
          >
            Here&apos;s what&apos;s new in your gaming journey
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-8">
            {/* Popular on Binnacle */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Popular on Binnacle
                  </h2>
                </div>
                <button
                  onClick={() => router.push("/discover")}
                  className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)]"
                  style={{ fontSize: "var(--bkl-font-size-sm)" }}
                >
                  Explore All →
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {isLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-40 bg-[var(--bkl-color-bg-secondary)]" />
                    ))}
                  </>
                ) : popularGames.length > 0 ? (
                  popularGames.map((game) => (
                    <GameCard
                      key={game._id}
                      game={{
                        id: game._id,
                        title: game.title,
                        cover: game.coverUrl,
                        coverUrl: game.coverUrl,
                        rating: game.aggregatedRating,
                      }}
                      variant="compact"
                      onClick={() => router.push(`/game/${game._id}`)}
                    />
                  ))
                ) : null}
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[var(--bkl-color-text-primary)]"
                  style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                >
                  Recent Activity
                </h2>

                <Tabs value={activityTab} onValueChange={(value) => setActivityTab(value as ActivityTab)}>
                  <TabsList className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)]">
                    <TabsTrigger value="friends">Friends</TabsTrigger>
                    <TabsTrigger value="community">Community</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-4">
                <FeedReviewList entries={activityEntries} isLoading={isLoading} />
              </div>
            </section>

            {/* Based on Your History */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[var(--bkl-color-text-primary)]"
                  style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                >
                  Based on Your History
                </h2>
                <button
                  onClick={() => router.push("/backlog")}
                  className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)]"
                  style={{ fontSize: "var(--bkl-font-size-sm)" }}
                >
                  See More →
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {isLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-40 bg-[var(--bkl-color-bg-secondary)]" />
                    ))}
                  </>
                ) : (
                  feedTimeline?.friends
                    .slice(0, 5)
                    .map((entry) => entry.game)
                    .filter((game, index, self) => self.findIndex((g) => g._id === game._id) === index)
                    .map((game) => (
                      <GameCard
                        key={game._id}
                        game={{
                          id: game._id,
                          title: game.title,
                          cover: game.coverUrl,
                          coverUrl: game.coverUrl,
                          rating: game.aggregatedRating,
                        }}
                        variant="compact"
                        onClick={() => router.push(`/game/${game._id}`)}
                      />
                    ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ad Space - Top */}
            <AdSpace variant="sidebar" />

            {/* Discover People */}
            <div
              className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 shadow-[var(--bkl-shadow-md)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Discover People
                  </h2>
                </div>
                <button
                  onClick={() => router.push("/discover/people")}
                  className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--bkl-color-border)] scrollbar-track-transparent pr-2">
                <div className="space-y-3">
                  {isLoading || discoverPeople === undefined ? (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 bg-[var(--bkl-color-bg-tertiary)]" />
                      ))}
                    </>
                  ) : peopleToDisplay.length === 0 ? (
                    <p className="text-[var(--bkl-color-text-disabled)] text-center py-4" style={{ fontSize: "var(--bkl-font-size-sm)" }}>
                      No other users to discover
                    </p>
                  ) : peopleToDisplay.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => router.push(`/profile/${user.username}`)}
                      className="w-full bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-md)] p-4 transition-all hover:shadow-[var(--bkl-shadow-glow)] group text-left"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[var(--bkl-color-text-primary)] truncate"
                            style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                          >
                            {user.name}
                          </p>
                          <p
                            className="text-[var(--bkl-color-text-disabled)] truncate"
                            style={{ fontSize: "var(--bkl-font-size-sm)" }}
                          >
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[var(--bkl-color-accent-primary)]"
                            style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                          >
                            0
                          </span>
                          <span
                            className="text-[var(--bkl-color-text-disabled)]"
                            style={{ fontSize: "var(--bkl-font-size-sm)" }}
                          >
                            reviews
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Your Stats */}
            <div
              className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 shadow-[var(--bkl-shadow-md)]"
            >
              <h2
                className="text-[var(--bkl-color-text-primary)] mb-4"
                style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                Your Stats
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[var(--bkl-color-text-secondary)]"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  >
                    Total Reviews
                  </span>
                  <span
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {communityEntries.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[var(--bkl-color-text-secondary)]"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  >
                    Average Rating
                  </span>
                  <span
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {communityEntries.length > 0
                      ? (communityEntries.reduce((total, entry) => total + entry.review.rating, 0) / communityEntries.length).toFixed(1)
                      : "0.0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[var(--bkl-color-text-secondary)]"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  >
                    Hours Played
                  </span>
                  <span
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {communityEntries.reduce((sum, entry) => sum + (entry.review.playtimeHours || 0), 0).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ad Space - Bottom */}
            <AdSpace variant="sidebar" />
          </div>
        </div>

        {/* Banner Ad - Bottom of Feed */}
        <div className="mt-8 flex justify-center">
          <AdSpace variant="banner" className="w-full max-w-[728px]" />
        </div>
      </div>
    </div>
  );
}
