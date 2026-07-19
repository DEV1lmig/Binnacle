import { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useClerk } from "@clerk/clerk-expo";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Body, Button, Card, Heading, Input, Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY, STATUS_COLORS } from "@binnacle/design-tokens";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { formatNumber, formatDate } from "@/src/lib/format";
import { HudBadge, HudDivider, CornerMarkers, SectionHeader, StatPill } from "@/src/ui/hud";
import { User, Settings, Gamepad2, ChevronRight, Play, CheckCircle2, ListTodo, PauseCircle, XCircle } from "lucide-react-native";
import { Image } from "@/src/tw/image";

type TopGameDraft = {
  gameId: Id<"games">;
  title: string;
  note: string;
};

export default function ProfileTab() {
  const router = useRouter();
  const { signOut } = useClerk();
  const dashboard = useQuery(api.users.dashboard, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const setTopGames = useMutation(api.users.setTopGames);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [editingTopGames, setEditingTopGames] = useState(false);
  const [topGamesSearch, setTopGamesSearch] = useState("");
  const [topGamesDraft, setTopGamesDraft] = useState<TopGameDraft[]>([]);

  const gameSearchResults = useQuery(
    api.games.searchCached,
    editingTopGames && topGamesSearch.trim().length > 0
      ? { query: topGamesSearch.trim(), limit: 8 }
      : "skip"
  );

  useEffect(() => {
    if (!dashboard || editingTopGames) {
      return;
    }

    setTopGamesDraft(
      dashboard.topGames.map((entry) => ({
        gameId: entry.game._id,
        title: entry.game.title,
        note: entry.note ?? "",
      }))
    );
  }, [dashboard, editingTopGames]);

  if (dashboard === undefined) {
    return <LoadingState label="Loading profile..." />;
  }

  if (!dashboard) {
    return <LoadingState label="Preparing profile..." />;
  }

  const onSave = async () => {
    try {
      await updateProfile({
        name: name.trim() ? name.trim() : dashboard.user.name,
        bio: bio.trim() ? bio.trim() : "",
      });
      setEditing(false);
    } catch (error: any) {
      Alert.alert("Could not update profile", error?.message ?? "Please try again.");
    }
  };

  const onAddTopGame = (game: { _id: Id<"games">; title: string }) => {
    setTopGamesDraft((prev) => {
      if (prev.some((entry) => entry.gameId === game._id) || prev.length >= 5) {
        return prev;
      }
      return [...prev, { gameId: game._id, title: game.title, note: "" }];
    });
  };

  const onSaveTopGames = async () => {
    try {
      await setTopGames({
        entries: topGamesDraft.map((entry) => ({
          gameId: entry.gameId,
          note: entry.note.trim() ? entry.note.trim() : undefined,
        })),
      });
      setEditingTopGames(false);
      setTopGamesSearch("");
      Alert.alert("Saved", "Top games updated.");
    } catch (error: any) {
      Alert.alert("Could not save top games", error?.message ?? "Please try again.");
    }
  };

  const TopButton = ({ icon: Icon, label, color = C.textMuted, onPress, active = false }: any) => (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center border flex-1 ${
        active ? "bg-gold/15" : "bg-bg"
      }`}
      style={{
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderColor: active ? C.gold : C.borderLight,
        borderStyle: "dashed",
        borderRadius: 4,
      }}
    >
      <Icon size={14} color={active ? C.gold : color} />
      <Text
        style={{ fontFamily: FONT_MONO }}
        className={`text-xs uppercase tracking-wider ${active ? "text-gold" : "text-textMuted"}`}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 96 }}>

        {/* TOP ACTIONS */}
        <View style={{ gap: 8 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            <TopButton icon={User} label="Operator Profile" active={!editing && !editingTopGames} onPress={() => { setEditing(false); setEditingTopGames(false); }} />
            <TopButton icon={Settings} label="Edit Profile" active={editing} onPress={() => {
              setName(dashboard.user.name);
              setBio(dashboard.user.bio ?? "");
              setEditingTopGames(false);
              setEditing(true);
            }} />
          </View>
          <TopButton icon={Gamepad2} label="Manage Top Games" active={editingTopGames} color={C.gold} onPress={() => {
            setEditing(false);
            setEditingTopGames(true);
          }} />
        </View>

        {editing ? (
          <View className="border border-borderLight bg-surface" style={{ padding: 16, borderRadius: 4, gap: 16 }}>
            <Input label="Display name" value={name} onChangeText={setName} placeholder={dashboard.user.name} />
            <Input label="Bio" value={bio} onChangeText={setBio} placeholder={dashboard.user.bio ?? "Tell people what you play"} />
            <View className="flex-row" style={{ gap: 8, marginTop: 8 }}>
              <Button label="Save" onPress={() => void onSave()} style={{ flex: 1 }} />
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : editingTopGames ? (
          <View className="border border-borderLight bg-surface" style={{ padding: 16, borderRadius: 4, gap: 16 }}>
            <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Edit Top Games</Text>
            {topGamesDraft.map((entry, index) => (
              <View key={`${entry.gameId}`} className="bg-bg border border-borderLight" style={{ padding: 12, borderRadius: 4, gap: 8 }}>
                <Text style={{ fontFamily: FONT_HEADING }} className="text-base text-text">
                  #{index + 1} {entry.title}
                </Text>
                <Button label="Remove" variant="danger" onPress={() => {
                  setTopGamesDraft((prev) => prev.filter((item) => item.gameId !== entry.gameId));
                }} />
              </View>
            ))}
            <Input
              label="Find games"
              value={topGamesSearch}
              onChangeText={setTopGamesSearch}
              placeholder="Search your next top game"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {(gameSearchResults ?? []).slice(0, 4).map((game) => (
              <View key={`${game._id}`} className="flex-row items-center justify-between bg-bg border border-borderLight" style={{ padding: 8, borderRadius: 4 }}>
                <Text className="text-text flex-1 text-base" style={{ fontFamily: FONT_BODY }}>{game.title}</Text>
                <Button label="Add" variant="secondary" onPress={() => onAddTopGame({ _id: game._id, title: game.title })} />
              </View>
            ))}
            <View className="flex-row" style={{ gap: 8, marginTop: 8 }}>
              <Button label="Save" onPress={() => void onSaveTopGames()} style={{ flex: 1 }} />
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setEditingTopGames(false); setTopGamesSearch(""); }} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* PROFILE HEADER */}
            <View className="border items-center relative overflow-hidden" style={{ padding: 16, borderRadius: 12, borderColor: C.borderLight, backgroundColor: C.surface }}>
              <CornerMarkers size={16} color={C.borderLight} />

              <View className="items-center justify-center rounded-full border-2 border-borderLight bg-surface z-10 relative" style={{ width: 80, height: 80 }}>
                <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-gold">
                  {dashboard.user.name[0]?.toUpperCase()}
                </Text>
                <View className="absolute bottom-0 right-0 rounded-full border-2 border-surface bg-green" style={{ width: 16, height: 16 }} />
              </View>

              <Text style={{ fontFamily: FONT_HEADING, marginTop: 12 }} className="text-2xl text-text text-center">
                {dashboard.user.name}
              </Text>
               <Text style={{ fontFamily: FONT_MONO, marginTop: 4 }} className="text-xs text-textMuted uppercase tracking-wider text-center">
                @{dashboard.user.username} · Since {formatDate(dashboard.user._creationTime)}
              </Text>

              {dashboard.user.bio && (
                <Text style={{ fontFamily: FONT_BODY, marginTop: 16 }} className="text-sm text-textDim text-center">
                  {dashboard.user.bio}
                </Text>
              )}

              {/* STATS — two explicit rows to avoid flex-wrap clipping inside overflow-hidden */}
              <View className="w-full" style={{ marginTop: 16, gap: 8 }}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {[
                    { label: "Followers", value: dashboard.followerCount },
                    { label: "Following", value: dashboard.followingCount },
                    { label: "Reviews", value: dashboard.reviewStats.reviewCount, color: C.accent },
                  ].map((s, i) => (
                    <View key={i} className="flex-1 items-center justify-center border bg-bg" style={{ padding: 12, borderColor: C.borderLight, borderStyle: "dashed", borderRadius: 4 }}>
                      <Text style={{ fontFamily: FONT_HEADING, color: s.color || C.cyan }} className="text-xl">{s.value}</Text>
                      <Text style={{ fontFamily: FONT_MONO, fontSize: 9, marginTop: 4 }} className="text-textMuted uppercase tracking-widest">{s.label}</Text>
                    </View>
                  ))}
                </View>
                <View className="flex-row" style={{ gap: 8 }}>
                  {[
                    { label: "Backlog", value: dashboard.backlogStats.total, color: C.accent },
                    { label: "Avg Rating", value: dashboard.reviewStats.averageRating?.toFixed(1) || "0.0", color: C.gold },
                  ].map((s, i) => (
                    <View key={i} className="flex-1 items-center justify-center border bg-bg" style={{ padding: 12, borderColor: C.borderLight, borderStyle: "dashed", borderRadius: 4 }}>
                      <Text style={{ fontFamily: FONT_HEADING, color: s.color || C.cyan }} className="text-xl">{s.value}</Text>
                      <Text style={{ fontFamily: FONT_MONO, fontSize: 9, marginTop: 4 }} className="text-textMuted uppercase tracking-widest">{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* HALL OF FAME */}
            <View style={{ gap: 16 }}>
              <HudBadge color={C.cyan}>Hall of Fame</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Top Games</Text>

              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {dashboard.topGames.map((entry, idx) => (
                  <View key={`${entry.game._id}`} className="overflow-hidden relative" style={{ width: "48%", aspectRatio: 1, borderRadius: 6 }}>
                    {entry.game.coverUrl ? (
                      <Image source={{ uri: entry.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : (
                      <View className="flex-1 bg-surface items-center justify-center"><Gamepad2 color={C.textMuted} /></View>
                    )}
                    <View className="absolute inset-0 bg-black/40" />
                    <View className="absolute bg-gold" style={{ top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-bg font-bold">#{idx + 1}</Text>
                    </View>
                    <View className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ padding: 8 }}>
                      <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-text font-medium" numberOfLines={1}>
                        {entry.game.title}
                      </Text>
                    </View>
                  </View>
                ))}
                {dashboard.topGames.length === 0 && (
                  <Text style={{ fontFamily: FONT_BODY }} className="text-base text-textMuted">No top games pinned.</Text>
                )}
              </View>
            </View>

            {/* BACKLOG INVENTORY */}
            <View style={{ gap: 16 }}>
              <HudBadge color={C.cyan}>Inventory</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Backlog</Text>

              <View className="border bg-surface" style={{ padding: 16, borderRadius: 12, gap: 16, borderColor: C.borderLight }}>
                {/* Progress bar */}
                <View className="w-full bg-bgAlt rounded-full overflow-hidden" style={{ height: 8 }}>
                  <View
                    className="bg-gold"
                    style={{ height: "100%", width: `${dashboard.backlogStats.total ? (dashboard.backlogStats.completed / dashboard.backlogStats.total) * 100 : 0}%` }}
                  />
                </View>

                {/* Rows */}
                {[
                  { label: "Playing", value: dashboard.backlogStats.playing, color: STATUS_COLORS.playing, icon: Play },
                  { label: "Completed", value: dashboard.backlogStats.completed, color: STATUS_COLORS.completed, icon: CheckCircle2 },
                  { label: "Want to Play", value: dashboard.backlogStats.want_to_play, color: STATUS_COLORS.backlog, icon: ListTodo },
                  { label: "On Hold", value: dashboard.backlogStats.on_hold, color: STATUS_COLORS.onhold, icon: PauseCircle },
                  { label: "Dropped", value: dashboard.backlogStats.dropped, color: STATUS_COLORS.dropped, icon: XCircle },
                ].map((s, i) => (
                  <View key={i} className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
                    <View className="flex-row items-center" style={{ gap: 12 }}>
                      <View className="rounded-full" style={{ width: 8, height: 8, backgroundColor: s.color }} />
                      <s.icon size={14} color={C.textMuted} />
                      <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted uppercase tracking-wider">{s.label}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-sm text-text">{s.value}</Text>
                  </View>
                ))}
                <HudDivider />
                <View className="flex-row items-center justify-between" style={{ paddingTop: 4 }}>
                  <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim uppercase tracking-wider">Total</Text>
                  <Text style={{ fontFamily: FONT_MONO }} className="text-lg text-gold">{dashboard.backlogStats.total}</Text>
                </View>
              </View>
            </View>

            {/* ANALYTICS */}
            <View style={{ gap: 16 }}>
              <HudBadge color={C.gold}>Analytics</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Review Highlights</Text>

              <View className="border bg-surface relative overflow-hidden" style={{ padding: 16, borderRadius: 12, borderColor: C.borderLight }}>
                <CornerMarkers size={12} color={C.borderLight} />
                <View className="flex-row justify-between border-b" style={{ paddingBottom: 24, borderColor: C.borderLight }}>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-accent">{dashboard.reviewStats.reviewCount}</Text>
                    <Text style={{ fontFamily: FONT_MONO, fontSize: 9, marginTop: 4 }} className="text-textDim uppercase tracking-widest">Reviews</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-gold">{dashboard.reviewStats.averageRating?.toFixed(1) || "0.0"}</Text>
                    <Text style={{ fontFamily: FONT_MONO, fontSize: 9, marginTop: 4 }} className="text-textDim uppercase tracking-widest">Avg Rating</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-cyan">{dashboard.reviewStats.totalPlaytimeHours || 0}</Text>
                    <Text style={{ fontFamily: FONT_MONO, fontSize: 9, marginTop: 4 }} className="text-textDim uppercase tracking-widest">Hours Logged</Text>
                  </View>
                </View>
                <View style={{ paddingTop: 16, gap: 8 }}>
                  <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim uppercase tracking-wider">Top Platforms</Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {dashboard.reviewStats.topPlatforms?.map(p => (
                      <View key={p.name} className="flex-row items-center border bg-bg" style={{ borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, gap: 8, borderColor: C.borderLight }}>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted uppercase">{p.name}</Text>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-cyan">{p.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* MISSION LOG (Recent Reviews) */}
            <View style={{ gap: 16 }}>
              <HudBadge color={C.green}>Mission Log</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Recent Activity</Text>

              <View style={{ gap: 8 }}>
                {dashboard.recentReviews.map((review) => (
                  <Pressable
                    key={`${review._id}`}
                    onPress={() => router.push(`/review/${review._id}`)}
                    className="flex-row items-center border bg-surface"
                    style={{ padding: 12, borderRadius: 12, gap: 16, borderColor: C.borderLight }}
                  >
                    <View className="overflow-hidden" style={{ width: 48, height: 64, borderRadius: 4 }}>
                      {review.game.coverUrl ? (
                        <Image source={{ uri: review.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <View className="flex-1 bg-bgAlt items-center justify-center"><Gamepad2 size={16} color={C.textMuted} /></View>
                      )}
                    </View>
                    <View className="flex-1" style={{ gap: 4 }}>
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: FONT_HEADING }} className="text-base text-text">{review.game.title}</Text>
                        <ChevronRight size={16} color={C.textDim} />
                      </View>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-amber uppercase tracking-wider">★ {review.rating}/10</Text>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim uppercase tracking-wider">{review.platform}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted" numberOfLines={1}>{review.text}</Text>
                    </View>
                  </Pressable>
                ))}
                {dashboard.recentReviews.length === 0 && (
                  <Text style={{ fontFamily: FONT_BODY }} className="text-base text-textMuted">No recent activity.</Text>
                )}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
