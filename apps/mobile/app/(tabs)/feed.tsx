import { Activity, Star, Clock, Gamepad2, PenLine, Heart, MessageSquare } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Screen } from "@/src/ui/primitives";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { GameCard } from "@/src/ui/GameCard";
import { HudBadge, HudDivider, StatPill, SectionHeader, TabButton } from "@/src/ui/hud";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { toIdString } from "@/src/lib/id";
import { formatNumber, formatDate } from "@/src/lib/format";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { Image } from "@/src/tw/image";

export default function FeedTab() {
  const router = useRouter();
  const toggleLike = useMutation(api.likes.toggle);
  const timeline = useQuery(api.feed.timeline, { limit: 30 });
  const dashboard = useQuery(api.users.dashboard, {});
  const trendingData = useQuery(api.games.getTrendingGames, { limit: 10 });
  const peopleData = useQuery(api.users.search, { query: "", limit: 8 });
  const [activeTab, setActiveTab] = useState<"friends" | "community">("friends");

  const entries = useMemo(() => {
    if (!timeline) return [];
    const sorted = [...timeline.friends, ...timeline.community].sort(
      (a, b) => b.review._creationTime - a.review._creationTime
    );
    return sorted;
  }, [timeline]);

  const friendEntries = useMemo(
    () => (timeline ? [...timeline.friends].sort((a, b) => b.review._creationTime - a.review._creationTime) : []),
    [timeline]
  );

  const communityEntries = useMemo(
    () => (timeline ? [...timeline.community].sort((a, b) => b.review._creationTime - a.review._creationTime) : []),
    [timeline]
  );

  const trending = useMemo(() => trendingData?.games ?? [], [trendingData]);

  const stats = useMemo(() => {
    if (!dashboard) return null;
    const rs = dashboard.reviewStats;
    return {
      reviews: rs.reviewCount,
      avgRating: rs.averageRating ? rs.averageRating.toFixed(1) : "—",
      hours: Math.round(rs.totalPlaytimeHours),
      games: dashboard.backlogStats.total,
    };
  }, [dashboard]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayEntries = activeTab === "friends" ? friendEntries : communityEntries;

  if (timeline === undefined) {
    return <LoadingState label="Loading feed..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-4 py-4 gap-6 pb-24">
        {/* Greeting bar */}
        <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
          <View className="flex-row items-center" style={{ gap: 12, flex: 1, minWidth: 0 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 9999,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.borderLight,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {dashboard?.user.avatarUrl ? (
                <Image source={{ uri: dashboard.user.avatarUrl }} style={{ width: 44, height: 44 }} resizeMode="cover" />
              ) : (
                <Text className="text-xl" style={{ fontFamily: FONT_HEADING, color: C.gold, fontWeight: "300" }}>
                  {(dashboard?.user.name ?? "?")[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} className="text-sm" style={{ fontFamily: FONT_MONO, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
                {greeting}, archivist
              </Text>
              <Text numberOfLines={1} className="text-2xl" style={{ fontFamily: FONT_HEADING, fontWeight: "300", color: C.text }}>
                {dashboard?.user.name ?? "Loading..."}
              </Text>
            </View>
          </View>
          <Pressable
            // Reviews start from a game: send the user to Discover to pick one
            // (the game page's "Write a Review" opens the editor pre-locked).
            onPress={() => router.push("/(tabs)/discover")}
            className="flex-row items-center active:opacity-70"
            style={{
              flexShrink: 0,
              backgroundColor: C.gold,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 2,
              gap: 6,
              shadowColor: C.gold,
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            }}
          >
            <PenLine size={14} color={C.bg} strokeWidth={2.5} />
            <Text className="text-sm" style={{ fontFamily: FONT_MONO, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, color: C.bg }}>
              Review
            </Text>
          </Pressable>
        </View>

        {/* Stats grid */}
        {stats ? (
          // Two explicit rows (like profile.tsx) — flex-wrap doesn't reliably
          // break rows here, which squeezed the pills until labels clipped.
          <View style={{ gap: 8 }}>
            <View className="flex-row" style={{ gap: 8 }}>
              <StatPill label="Reviews" value={formatNumber(stats.reviews)} icon={Activity} color={C.cyan} />
              <StatPill label="Avg Rating" value={stats.avgRating} icon={Star} color={C.amber} />
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              <StatPill label="Hours" value={formatNumber(stats.hours)} icon={Clock} color={C.green} />
              <StatPill label="Games" value={formatNumber(stats.games)} icon={Gamepad2} color={C.accent} />
            </View>
          </View>
        ) : null}

        {/* Trending carousel */}
        {trending.length > 0 ? (
          <View>
            <SectionHeader title="Trending" badge="Hot" badgeColor={C.cyan} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {trending.map((game) => (
                <GameCard
                  key={`${game._id}`}
                  gameId={game._id}
                  title={game.title}
                  coverUrl={game.coverUrl}
                  releaseYear={game.releaseYear}
                  aggregatedRating={game.aggregatedRating}
                  width={140}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <HudDivider />

        {/* Activity feed with tabs */}
        <View>
          <SectionHeader title="Activity" badge="Feed" badgeColor={C.accent} />
          <View className="flex-row" style={{ gap: 0, marginBottom: 16 }}>
            <TabButton
              label="Friends"
              active={activeTab === "friends"}
              onPress={() => setActiveTab("friends")}
              count={friendEntries.length}
            />
            <TabButton
              label="Community"
              active={activeTab === "community"}
              onPress={() => setActiveTab("community")}
              count={communityEntries.length}
            />
          </View>

          {displayEntries.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: C.borderLight,
                borderRadius: 2,
                padding: 24,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Activity size={24} color={C.textDim} strokeWidth={1.5} />
              <Text className="text-lg" style={{ fontFamily: FONT_HEADING, color: C.textMuted, fontWeight: "300" }}>
                No {activeTab} activity yet
              </Text>
              <Text className="text-sm" style={{ fontFamily: FONT_BODY, color: C.textDim, textAlign: "center" }}>
                {activeTab === "friends"
                  ? "Follow more players to see their reviews here."
                  : "Community reviews will appear here once available."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {displayEntries.map((entry) => {
                const reviewId = toIdString(entry.review._id);
                const gameId = toIdString(entry.game._id);
                return (
                  <View key={`${entry.review._id}`} style={{ gap: 8 }}>
                    <ReviewCard
                      title={entry.game.title}
                      rating={entry.review.rating}
                      authorName={entry.author.name}
                      authorUsername={entry.author.username}
                      excerpt={entry.review.text}
                      coverUrl={entry.game.coverUrl}
                      likeCount={entry.likeCount}
                      commentCount={entry.commentCount}
                      createdAt={entry.review._creationTime}
                      onPress={() => {
                        if (reviewId) {
                          router.push({ pathname: "/review/[id]", params: { id: reviewId } });
                        }
                      }}
                    />
                    <View className="flex-row" style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          if (reviewId) void toggleLike({ reviewId: entry.review._id });
                        }}
                        className="flex-row items-center active:opacity-70"
                        style={{
                          borderWidth: 1,
                          borderColor: entry.viewerHasLiked ? C.gold : C.border,
                          backgroundColor: entry.viewerHasLiked ? `${C.gold}15` : "transparent",
                          borderRadius: 2,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          gap: 6,
                        }}
                      >
                        <Heart
                          size={14}
                          color={entry.viewerHasLiked ? C.gold : C.textMuted}
                          fill={entry.viewerHasLiked ? C.gold : "none"}
                          strokeWidth={2}
                        />
                        <Text className="text-sm" style={{ fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: 1, color: entry.viewerHasLiked ? C.gold : C.textMuted }}>
                          {entry.viewerHasLiked ? "Liked" : "Like"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (gameId) router.push({ pathname: "/game/[id]", params: { id: gameId } });
                        }}
                        className="flex-row items-center active:opacity-70"
                        style={{
                          borderWidth: 1,
                          borderColor: C.border,
                          borderRadius: 2,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          gap: 6,
                        }}
                      >
                        <MessageSquare size={14} color={C.textMuted} strokeWidth={2} />
                        <Text className="text-sm" style={{ fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted }}>
                          Game
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* People section */}
        {peopleData && peopleData.length > 0 ? (
          <View>
            <SectionHeader
              title="People"
              badge="Network"
              badgeColor={C.green}
              action="View All"
              onAction={() => router.push("/friends")}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {peopleData.map((user) => (
                <Pressable
                  key={`${user._id}`}
                  onPress={() => router.push({ pathname: "/user/[username]", params: { username: user.username } })}
                  className="active:opacity-70"
                  style={{
                    width: 160,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 2,
                    padding: 12,
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      backgroundColor: C.bgAlt,
                      borderWidth: 1,
                      borderColor: C.borderLight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text className="text-lg" style={{ fontFamily: FONT_HEADING, color: C.gold, fontWeight: "300" }}>
                      {(user.name ?? "?")[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    className="text-sm"
                    style={{ fontFamily: FONT_BODY, fontWeight: "500", color: C.text }}
                  >
                    {user.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-sm"
                    style={{ fontFamily: FONT_MONO, color: C.textDim }}
                  >
                    @{user.username}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
