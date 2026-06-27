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
      className={`flex-row items-center justify-center gap-2 py-3 px-4 border flex-1 ${
        active ? "bg-gold/15" : "bg-bg"
      }`}
      style={{
        borderColor: active ? C.gold : C.borderLight,
        borderStyle: "dashed",
        borderRadius: 4,
      }}
    >
      <Icon size={14} color={active ? C.gold : color} />
      <Text
        style={{ fontFamily: FONT_MONO }}
        className={`text-[10px] uppercase tracking-wider ${active ? "text-gold" : "text-textMuted"}`}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen edges={["top", "left", "right"]}>
      <ScrollView contentContainerClassName="p-4 gap-6 pb-24">
        
        {/* TOP ACTIONS */}
        <View className="gap-2">
          <View className="flex-row gap-2">
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
          <View className="p-4 border border-borderLight rounded bg-surface gap-4">
            <Input label="Display name" value={name} onChangeText={setName} placeholder={dashboard.user.name} />
            <Input label="Bio" value={bio} onChangeText={setBio} placeholder={dashboard.user.bio ?? "Tell people what you play"} />
            <View className="flex-row gap-2 mt-2">
              <Button label="Save" onPress={() => void onSave()} style={{ flex: 1 }} />
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : editingTopGames ? (
          <View className="p-4 border border-borderLight rounded bg-surface gap-4">
            <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Edit Top Games</Text>
            {topGamesDraft.map((entry, index) => (
              <View key={`${entry.gameId}`} className="p-3 bg-bg rounded border border-borderLight gap-2">
                <Text style={{ fontFamily: FONT_HEADING }} className="text-text">
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
              <View key={`${game._id}`} className="flex-row items-center justify-between bg-bg p-2 rounded border border-borderLight">
                <Text className="text-text flex-1" style={{ fontFamily: FONT_BODY }}>{game.title}</Text>
                <Button label="Add" variant="secondary" onPress={() => onAddTopGame({ _id: game._id, title: game.title })} />
              </View>
            ))}
            <View className="flex-row gap-2 mt-2">
              <Button label="Save" onPress={() => void onSaveTopGames()} style={{ flex: 1 }} />
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setEditingTopGames(false); setTopGamesSearch(""); }} />
            </View>
          </View>
        ) : (
          <View className="gap-6">
            {/* PROFILE HEADER */}
            <View className="p-4 border rounded-xl items-center relative overflow-hidden" style={{ borderColor: C.borderLight, backgroundColor: C.surface }}>
              <CornerMarkers size={16} color={C.borderLight} />
              
              <View className="items-center justify-center w-20 h-20 rounded-full border-2 border-borderLight bg-surface z-10 relative">
                <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-gold">
                  {dashboard.user.name[0]?.toUpperCase()}
                </Text>
                <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface bg-green" />
              </View>

              <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-text mt-3 text-center">
                {dashboard.user.name}
              </Text>
               <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted uppercase tracking-wider mt-1 text-center">
                @{dashboard.user.username} · Since {formatDate(dashboard.user._creationTime)}
              </Text>

              {dashboard.user.bio && (
                <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textDim mt-4 text-center">
                  {dashboard.user.bio}
                </Text>
              )}

              {/* STATS — two explicit rows to avoid flex-wrap clipping inside overflow-hidden */}
              <View className="mt-4 gap-2 w-full">
                <View className="flex-row gap-2">
                  {[
                    { label: "Followers", value: dashboard.followerCount },
                    { label: "Following", value: dashboard.followingCount },
                    { label: "Reviews", value: dashboard.reviewStats.reviewCount, color: C.accent },
                  ].map((s, i) => (
                    <View key={i} className="flex-1 p-3 items-center justify-center border bg-bg" style={{ borderColor: C.borderLight, borderStyle: "dashed", borderRadius: 4 }}>
                      <Text style={{ fontFamily: FONT_HEADING, color: s.color || C.cyan }} className="text-xl">{s.value}</Text>
                      <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textMuted uppercase tracking-widest mt-1">{s.label}</Text>
                    </View>
                  ))}
                </View>
                <View className="flex-row gap-2">
                  {[
                    { label: "Backlog", value: dashboard.backlogStats.total, color: C.accent },
                    { label: "Avg Rating", value: dashboard.reviewStats.averageRating?.toFixed(1) || "0.0", color: C.gold },
                  ].map((s, i) => (
                    <View key={i} className="flex-1 p-3 items-center justify-center border bg-bg" style={{ borderColor: C.borderLight, borderStyle: "dashed", borderRadius: 4 }}>
                      <Text style={{ fontFamily: FONT_HEADING, color: s.color || C.cyan }} className="text-xl">{s.value}</Text>
                      <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textMuted uppercase tracking-widest mt-1">{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* HALL OF FAME */}
            <View className="gap-4">
              <HudBadge color={C.cyan}>Hall of Fame</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Top Games</Text>
              
              <View className="flex-row flex-wrap gap-2">
                {dashboard.topGames.map((entry, idx) => (
                  <View key={`${entry.game._id}`} className="w-[48%] aspect-square rounded-md overflow-hidden relative">
                    {entry.game.coverUrl ? (
                      <Image source={{ uri: entry.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : (
                      <View className="flex-1 bg-surface items-center justify-center"><Gamepad2 color={C.textMuted} /></View>
                    )}
                    <View className="absolute inset-0 bg-black/40" />
                    <View className="absolute top-2 left-2 px-2 py-1 bg-gold rounded">
                      <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-bg font-bold">#{idx + 1}</Text>
                    </View>
                    <View className="absolute bottom-0 left-0 right-0 p-2 bg-black/60">
                      <Text style={{ fontFamily: FONT_BODY }} className="text-xs text-text font-medium" numberOfLines={1}>
                        {entry.game.title}
                      </Text>
                    </View>
                  </View>
                ))}
                {dashboard.topGames.length === 0 && (
                  <Text style={{ fontFamily: FONT_BODY }} className="text-textMuted">No top games pinned.</Text>
                )}
              </View>
            </View>

            {/* BACKLOG INVENTORY */}
            <View className="gap-4">
              <HudBadge color={C.cyan}>Inventory</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Backlog</Text>

              <View className="p-4 border rounded-xl bg-surface gap-4" style={{ borderColor: C.borderLight }}>
                {/* Progress bar */}
                <View className="h-2 w-full bg-bgAlt rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-gold" 
                    style={{ width: `${dashboard.backlogStats.total ? (dashboard.backlogStats.completed / dashboard.backlogStats.total) * 100 : 0}%` }} 
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
                  <View key={i} className="flex-row items-center justify-between py-1">
                    <View className="flex-row items-center gap-3">
                      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <s.icon size={14} color={C.textMuted} />
                      <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted uppercase tracking-wider">{s.label}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-sm text-text">{s.value}</Text>
                  </View>
                ))}
                <HudDivider />
                <View className="flex-row items-center justify-between pt-1">
                  <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim uppercase tracking-wider">Total</Text>
                  <Text style={{ fontFamily: FONT_MONO }} className="text-lg text-gold">{dashboard.backlogStats.total}</Text>
                </View>
              </View>
            </View>

            {/* ANALYTICS */}
            <View className="gap-4">
              <HudBadge color={C.gold}>Analytics</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Review Highlights</Text>
              
              <View className="p-4 border rounded-xl bg-surface relative overflow-hidden" style={{ borderColor: C.borderLight }}>
                <CornerMarkers size={12} color={C.borderLight} />
                <View className="flex-row justify-between pb-6 border-b" style={{ borderColor: C.borderLight }}>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-accent">{dashboard.reviewStats.reviewCount}</Text>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textDim uppercase tracking-widest mt-1">Reviews</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-gold">{dashboard.reviewStats.averageRating?.toFixed(1) || "0.0"}</Text>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textDim uppercase tracking-widest mt-1">Avg Rating</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-cyan">{dashboard.reviewStats.totalPlaytimeHours || 0}</Text>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textDim uppercase tracking-widest mt-1">Hours Logged</Text>
                  </View>
                </View>
                <View className="pt-4 gap-2">
                  <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textDim uppercase tracking-wider">Top Platforms</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {dashboard.reviewStats.topPlatforms?.map(p => (
                      <View key={p.name} className="flex-row items-center border rounded px-2 py-1 bg-bg gap-2" style={{ borderColor: C.borderLight }}>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase">{p.name}</Text>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-cyan">{p.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* MISSION LOG (Recent Reviews) */}
            <View className="gap-4">
              <HudBadge color={C.green}>Mission Log</HudBadge>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Recent Activity</Text>
              
              <View className="gap-2">
                {dashboard.recentReviews.map((review) => (
                  <Pressable 
                    key={`${review._id}`} 
                    onPress={() => router.push(`/review/${review._id}`)}
                    className="flex-row items-center p-3 border rounded-xl bg-surface gap-4" 
                    style={{ borderColor: C.borderLight }}
                  >
                    <View className="w-12 h-16 rounded overflow-hidden">
                      {review.game.coverUrl ? (
                        <Image source={{ uri: review.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <View className="flex-1 bg-bgAlt items-center justify-center"><Gamepad2 size={16} color={C.textMuted} /></View>
                      )}
                    </View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: FONT_HEADING }} className="text-text text-base">{review.game.title}</Text>
                        <ChevronRight size={16} color={C.textDim} />
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-amber uppercase tracking-wider">★ {review.rating}/10</Text>
                        <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textDim uppercase tracking-wider">{review.platform}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT_BODY }} className="text-xs text-textMuted" numberOfLines={1}>{review.text}</Text>
                    </View>
                  </Pressable>
                ))}
                {dashboard.recentReviews.length === 0 && (
                  <Text style={{ fontFamily: FONT_BODY }} className="text-textMuted">No recent activity.</Text>
                )}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
