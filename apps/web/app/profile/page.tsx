"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard } from "@/app/components/GameCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Settings, Users, Trophy, Gamepad2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { currentUser } = useCurrentUser();

  // Fetch current user's backlog
  const userBacklog = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  // Calculate stats
  const completedCount = userBacklog?.filter((item) => item.status === "completed").length || 0;
  const playingCount = userBacklog?.filter((item) => item.status === "playing").length || 0;
  const stats = {
    totalGames: userBacklog?.length || 0,
    completed: completedCount,
    playing: playingCount,
  };

  // Filter games by status
  const playingGames = userBacklog?.filter((item) => item.status === "playing" && item.game).map(item => ({
    id: item.game!._id,
    title: item.game!.title,
    cover: item.game!.coverUrl,
    coverUrl: item.game!.coverUrl,
    rating: item.game!.aggregatedRating,
    aggregatedRating: item.game!.aggregatedRating,
  })) || [];

  const completedGames = userBacklog?.filter((item) => item.status === "completed" && item.game).map(item => ({
    id: item.game!._id,
    title: item.game!.title,
    cover: item.game!.coverUrl,
    coverUrl: item.game!.coverUrl,
    rating: item.game!.aggregatedRating,
    aggregatedRating: item.game!.aggregatedRating,
  })) || [];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 text-center">
          <p className="text-[var(--bkl-color-text-secondary)]">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Profile Header */}
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8 mb-6 shadow-[var(--bkl-shadow-md)]">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-[var(--bkl-color-accent-primary)]">
              <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.fullName || 'User'} />
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] text-3xl">
                {clerkUser?.firstName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1
                    className="text-[var(--bkl-color-text-primary)] mb-1"
                    style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {currentUser?.name || clerkUser?.fullName || "Player"}
                  </h1>
                  <p
                    className="text-[var(--bkl-color-text-secondary)]"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  >
                    @{currentUser?.username || clerkUser?.username || "user"}
                  </p>
                  <p
                    className="text-[var(--bkl-color-text-secondary)] mt-2"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  >
                    {currentUser?.bio || "Passionate gamer"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[var(--bkl-color-bg-primary)] rounded-[var(--bkl-radius-md)] p-4 border border-[var(--bkl-color-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-4 h-4 text-[var(--bkl-color-accent-primary)]" />
                    <span
                      className="text-[var(--bkl-color-text-disabled)]"
                      style={{ fontSize: "var(--bkl-font-size-xs)" }}
                    >
                      Total Games
                    </span>
                  </div>
                  <p
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {stats.totalGames}
                  </p>
                </div>

                <div className="bg-[var(--bkl-color-bg-primary)] rounded-[var(--bkl-radius-md)] p-4 border border-[var(--bkl-color-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-[var(--bkl-color-status-completed)]" />
                    <span
                      className="text-[var(--bkl-color-text-disabled)]"
                      style={{ fontSize: "var(--bkl-font-size-xs)" }}
                    >
                      Completed
                    </span>
                  </div>
                  <p
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {stats.completed}
                  </p>
                </div>

                <div className="bg-[var(--bkl-color-bg-primary)] rounded-[var(--bkl-radius-md)] p-4 border border-[var(--bkl-color-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-4 h-4 text-[var(--bkl-color-status-playing)]" />
                    <span
                      className="text-[var(--bkl-color-text-disabled)]"
                      style={{ fontSize: "var(--bkl-font-size-xs)" }}
                    >
                      Playing
                    </span>
                  </div>
                  <p
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    {stats.playing}
                  </p>
                </div>

                <div className="bg-[var(--bkl-color-bg-primary)] rounded-[var(--bkl-radius-md)] p-4 border border-[var(--bkl-color-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[var(--bkl-color-accent-primary)]" />
                    <span
                      className="text-[var(--bkl-color-text-disabled)]"
                      style={{ fontSize: "var(--bkl-font-size-xs)" }}
                    >
                      Followers
                    </span>
                  </div>
                  <p
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                  >
                    0
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] p-1">
            <TabsTrigger
              value="games"
              className="data-[state=active]:bg-[var(--bkl-color-accent-primary)] data-[state=active]:text-[var(--bkl-color-bg-primary)]"
            >
              Games
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-[var(--bkl-color-accent-primary)] data-[state=active]:text-[var(--bkl-color-bg-primary)]"
            >
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value="lists"
              className="data-[state=active]:bg-[var(--bkl-color-accent-primary)] data-[state=active]:text-[var(--bkl-color-bg-primary)]"
            >
              Lists
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-[var(--bkl-color-accent-primary)] data-[state=active]:text-[var(--bkl-color-bg-primary)]"
            >
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="mt-0">
            <div className="space-y-6">
              {/* Currently Playing */}
              {playingGames.length > 0 && (
                <section>
                  <h2
                    className="text-[var(--bkl-color-text-primary)] mb-4 font-[family-name:var(--bkl-font-serif)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Currently Playing
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {playingGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        variant="compact"
                        onClick={() => router.push(`/game/${game.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {completedGames.length > 0 && (
                <section>
                  <h2
                    className="text-[var(--bkl-color-text-primary)] mb-4 font-[family-name:var(--bkl-font-serif)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Completed
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {completedGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        variant="compact"
                        onClick={() => router.push(`/game/${game.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="text-center py-16">
              <p className="text-[var(--bkl-color-text-secondary)]">Reviews coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="lists">
            <div className="text-center py-16">
              <p className="text-[var(--bkl-color-text-secondary)]">Lists coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="text-center py-16">
              <p className="text-[var(--bkl-color-text-secondary)]">Detailed stats coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
