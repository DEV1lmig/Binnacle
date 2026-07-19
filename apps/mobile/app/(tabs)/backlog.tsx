import { ListTodo, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Screen } from "@/src/ui/primitives";
import { GameCard } from "@/src/ui/GameCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { HudBadge, HudDivider, CornerMarkers } from "@/src/ui/hud";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY, STATUS_COLORS } from "@binnacle/design-tokens";
import { View, Text, ScrollView, Pressable, TextInput } from "@/src/tw";

const STATUS_META = [
  { key: "all", label: "All", color: C.text },
  { key: "want_to_play", label: "Want to Play", color: C.gold },
  { key: "playing", label: "Playing", color: C.green },
  { key: "completed", label: "Completed", color: C.amber },
  { key: "on_hold", label: "On Hold", color: C.amber },
  { key: "dropped", label: "Dropped", color: C.red },
] as const;

export default function BacklogTab() {
  const router = useRouter();
  const currentUser = useQuery(api.users.current);
  const dashboard = useQuery(api.users.dashboard, {});

  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_META)[number]["key"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const backlog = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id, limit: 200 } : "skip"
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: backlog?.length ?? 0,
      want_to_play: 0,
      playing: 0,
      completed: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const item of backlog ?? []) {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    }
    return counts;
  }, [backlog]);

  const completionPct = useMemo(() => {
    const total = backlog?.length ?? 0;
    if (total === 0) return 0;
    const completed = statusCounts.completed;
    return Math.round((completed / total) * 100);
  }, [backlog, statusCounts]);

  const filteredItems = useMemo(() => {
    if (!backlog) return [];
    let items = backlog;
    if (activeStatus !== "all") {
      items = items.filter((item) => item.status === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => (item.game?.title ?? "").toLowerCase().includes(q));
    }
    return items;
  }, [backlog, activeStatus, searchQuery]);

  if (currentUser === undefined || backlog === undefined || dashboard === undefined) {
    return <LoadingState label="Loading backlog..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-24">
        {/* Header */}
        <View style={{ gap: 12 }}>
          <HudBadge color={C.gold}>Collection</HudBadge>
          <View style={{ gap: 4 }}>
            <Text className="text-5xl" style={{ fontFamily: FONT_HEADING, fontWeight: "200", color: C.text, letterSpacing: -0.5 }}>
              Your Backlog
            </Text>
            <Text className="text-sm" style={{ fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: 1.5, color: C.gold, fontWeight: "400" }}>
              {statusCounts.all} GAMES TRACKED
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.bg,
            borderRadius: 2,
            paddingHorizontal: 12,
            height: 44,
            gap: 10,
          }}
        >
          <Search size={16} color={C.textDim} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search your backlog..."
            placeholderTextColor={C.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            className="text-base"
            style={{ flex: 1, fontFamily: FONT_BODY, color: C.text }}
          />
        </View>

        {/* Completion progress */}
        <View
          style={{
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 2,
            padding: 16,
            gap: 10,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted }}>
              Completion
            </Text>
            <Text className="text-base" style={{ fontFamily: FONT_MONO, fontWeight: "600", color: C.green }}>
              {completionPct}%
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: C.bg,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${completionPct}%`,
                height: "100%",
                backgroundColor: C.green,
                borderRadius: 2,
              }}
            />
          </View>
          <Text className="text-sm" style={{ fontFamily: FONT_BODY, color: C.textDim }}>
            {statusCounts.completed} of {statusCounts.all} games completed
          </Text>
        </View>

        {/* Status filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {STATUS_META.map((status) => {
            const isActive = activeStatus === status.key;
            const count = statusCounts[status.key] ?? 0;
            return (
              <Pressable
                key={status.key}
                onPress={() => setActiveStatus(status.key)}
                className="flex-row items-center active:opacity-70"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? status.color : C.border,
                  backgroundColor: isActive ? `${status.color}15` : C.surface,
                  borderRadius: 2,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 9999,
                    backgroundColor: status.color,
                  }}
                />
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: FONT_MONO,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    fontWeight: isActive ? "600" : "400",
                    color: isActive ? status.color : C.textMuted,
                  }}
                >
                  {status.label}
                </Text>
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: FONT_MONO,
                    fontWeight: "600",
                    color: isActive ? status.color : C.textDim,
                  }}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <HudDivider />

        {/* Grid */}
        {filteredItems.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: C.borderLight,
              borderRadius: 2,
              padding: 32,
              alignItems: "center",
              gap: 12,
            }}
          >
            <CornerMarkers size={8} color={C.borderLight} />
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: C.bgAlt,
                borderWidth: 1,
                borderColor: C.borderLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ListTodo size={24} color={C.textDim} strokeWidth={1.5} />
            </View>
            <Text className="text-xl" style={{ fontFamily: FONT_HEADING, color: C.textMuted, fontWeight: "300" }}>
              {searchQuery ? "No matching games" : "Your backlog is empty"}
            </Text>
            <Text className="text-sm" style={{ fontFamily: FONT_BODY, color: C.textDim, textAlign: "center" }}>
              {searchQuery
                ? "Try a different search term."
                : "Add games from Discover or from game detail pages."}
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {filteredItems.map((item) => {
              const statusColor = STATUS_COLORS[item.status === "want_to_play" ? "backlog" : item.status === "on_hold" ? "onhold" : item.status] ?? C.textDim;
              return (
                <View key={`${item._id}`} style={{ width: "48%" }}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/game/[id]", params: { id: `${item.gameId}` } })}
                    className="active:opacity-80"
                  >
                    <GameCard
                      gameId={item.gameId}
                      title={item.game?.title ?? "Untitled Game"}
                      coverUrl={item.game?.coverUrl}
                      width={160}
                      style={{ width: "100%" }}
                    />
                  </Pressable>
                  <View
                    className="flex-row items-center self-start"
                    style={{
                      marginTop: 6,
                      gap: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 2,
                      backgroundColor: `${statusColor}15`,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 9999,
                        backgroundColor: statusColor,
                      }}
                    />
                    <Text
                      className="text-xs"
                      style={{
                        fontFamily: FONT_MONO,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: statusColor,
                        fontWeight: "500",
                      }}
                    >
                      {item.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
