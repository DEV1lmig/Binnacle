import { Gamepad2, Calendar, LayoutGrid, Heart, Bookmark, ChevronDown, PenLine, BookmarkCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Button, EmptyState, Screen } from "@/src/ui/primitives";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { Image } from "@/src/tw/image";
import { HudDivider, CornerMarkers, HudBadge } from "@/src/ui/hud";
import { toIdString } from "@/src/lib/id";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Game taxonomy (platforms/genres/developers/publishers) is stored as a JSON
 * string of {id, name, ...} objects. Parse it to a list of display names,
 * falling back to a comma-separated string for legacy rows.
 */
function parseNames(data?: string | null): string[] {
  if (!data) return [];
  const trimmed = data.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .map((item) => (typeof item === "string" ? item : item?.name))
        .filter((name): name is string => Boolean(name));
    } catch {
      // fall through to comma split
    }
  }
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const BACKLOG_STATUSES = [
  { key: "want_to_play", label: "Want to Play" },
  { key: "playing", label: "Playing" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
] as const;

export default function GameDetailPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string }>();
  const gameId = params.id as Id<"games"> | undefined;

  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  const [relatedItems, setRelatedItems] = useState<Array<{ id: number; title: string; category: string; releaseDate?: number }>>([]);
  const [showRelated, setShowRelated] = useState(false);

  const game = useQuery(api.games.getById, gameId ? { gameId } : "skip");
  const backlogItem = useQuery(
    api.backlog.getForCurrentUserAndGame,
    gameId ? { gameId } : "skip"
  );
  const reviews = useQuery(api.reviews.listForGame, gameId ? { gameId, limit: 30 } : "skip");

  const addToBacklog = useMutation(api.backlog.add);
  const removeFromBacklog = useMutation(api.backlog.removeByGameId);
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.removeByGameId);
  const favoriteStatus = useQuery(api.favorites.isFavorited, gameId ? { gameId } : "skip");
  const fetchRelatedContent = useAction(api.igdb.fetchRelatedContent);

  useEffect(() => {
    if (favoriteStatus !== undefined) {
      setIsFavorite(favoriteStatus);
    }
  }, [favoriteStatus]);

  if (!gameId || !gameId.length || game === undefined || backlogItem === undefined || reviews === undefined) {
    return <LoadingState label="Loading game..." />;
  }

  if (!game) {
    return (
      <Screen>
        <EmptyState icon={Gamepad2} title="Game not found" description="This game may have been removed or is unavailable." />
      </Screen>
    );
  }

  const onSetStatus = async (status: (typeof BACKLOG_STATUSES)[number]["key"]) => {
    try {
      setLoadingStatus(status);
      await addToBacklog({ gameId, status });
    } finally {
      setLoadingStatus(null);
    }
  };

  const onFetchRelated = async () => {
    if (relatedItems.length > 0) {
      setShowRelated(!showRelated);
      return;
    }
    try {
      setIsFetchingRelated(true);
      const data = await fetchRelatedContent({ gameTitle: game.title, igdbId: game.igdbId });
      setRelatedItems(Array.isArray(data) ? data : []);
      setShowRelated(true);
    } finally {
      setIsFetchingRelated(false);
    }
  };

  const formattedCoverUrl = game.coverUrl?.startsWith("//") ? `https:${game.coverUrl}` : game.coverUrl;

  const platformNames = parseNames(game.platforms);
  const genreNames = parseNames(game.genres);
  const developerNames = parseNames(game.developers);
  const publisherNames = parseNames(game.publishers);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="pb-24" bounces={false}>
        {/* HERO POSTER */}
        <View className="w-full relative" style={{ height: Math.min(windowWidth * 0.7, 380) }}>
          {formattedCoverUrl ? (
            <Image source={{ uri: formattedCoverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View className="flex-1 bg-surface items-center justify-center">
              <Gamepad2 size={48} color={C.textDim} />
            </View>
          )}
          {/* Overlay for text legibility */}
          <View className="absolute inset-0 bg-black/40" />
          <View className="absolute bottom-0 left-0 right-0 h-2/5 bg-black/70" />
          
          {/* Back button */}
          <Pressable 
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/"); }}
            className="absolute left-4 z-10 flex-row items-center gap-1"
            style={{ top: Math.max(insets.top, 16) }}
          >
            <Text style={{ fontFamily: FONT_MONO }} className="text-text uppercase tracking-widest text-xs">
              &lt; Back
            </Text>
          </Pressable>

          {/* Title and Meta */}
          <View className="absolute bottom-0 left-0 right-0 p-4 gap-2">
            <Text style={{ fontFamily: FONT_HEADING }} className="text-4xl text-text leading-tight">
              {game.title}
            </Text>
            <View className="flex-row flex-wrap items-center gap-4">
              {game.releaseYear && (
                <View className="flex-row items-center gap-1">
                  <Calendar size={14} color={C.textMuted} />
                  <Text style={{ fontFamily: FONT_MONO }} className="text-textMuted uppercase text-xs">{game.releaseYear}</Text>
                </View>
              )}
              {platformNames.length > 0 && (
                <View className="flex-row items-center gap-1 flex-shrink">
                  <Gamepad2 size={14} color={C.textMuted} />
                  <Text style={{ fontFamily: FONT_MONO }} className="text-textMuted uppercase text-xs flex-shrink" numberOfLines={1}>
                    {platformNames.join(" · ")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="gap-4">
          {/* ACTION ROW */}
          <View className="gap-2">
            <Pressable 
              onPress={() => setShowStatusPicker(!showStatusPicker)}
              className={`flex-row items-center justify-center py-3 px-4 rounded border ${backlogItem ? 'bg-gold/15 border-gold/30' : 'bg-surface border-borderLight'}`}
            >
              <LayoutGrid size={16} color={backlogItem ? C.gold : C.textMuted} />
              <Text style={{ fontFamily: FONT_MONO }} className={`ml-2 uppercase tracking-wider text-xs ${backlogItem ? 'text-gold' : 'text-text'}`}>
                {backlogItem ? backlogItem.status.replace(/_/g, " ") : "Add to Backlog"}
              </Text>
            </Pressable>

            {showStatusPicker && (
              <View className="border border-borderLight rounded bg-surface overflow-hidden">
                {BACKLOG_STATUSES.map(s => (
                  <Pressable
                    key={s.key}
                    onPress={async () => {
                      setShowStatusPicker(false);
                      if (backlogItem?.status === s.key) return;
                      await onSetStatus(s.key);
                    }}
                    className={`px-4 py-3 flex-row items-center justify-between ${backlogItem?.status === s.key ? 'bg-gold/15' : ''}`}
                  >
                    <Text style={{ fontFamily: FONT_BODY }} className={`text-sm ${backlogItem?.status === s.key ? 'text-gold' : 'text-text'}`}>
                      {s.label}
                    </Text>
                    {backlogItem?.status === s.key && (
                      <Text style={{ fontFamily: FONT_MONO }} className="text-gold text-[10px]">ACTIVE</Text>
                    )}
                  </Pressable>
                ))}
                {backlogItem && (
                  <Pressable
                    onPress={async () => {
                      setShowStatusPicker(false);
                      try {
                        setLoadingStatus("remove");
                        await removeFromBacklog({ gameId });
                      } finally {
                        setLoadingStatus(null);
                      }
                    }}
                    className="px-4 py-3 border-t border-borderLight"
                  >
                    <Text style={{ fontFamily: FONT_MONO }} className="text-red text-xs uppercase text-center">Remove from Backlog</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View className="flex-row gap-2">
              <Pressable 
                onPress={async () => {
                  try {
                    if (isFavorite) {
                      await removeFavorite({ gameId });
                      setIsFavorite(false);
                    } else {
                      await addFavorite({ gameId });
                      setIsFavorite(true);
                    }
                  } catch {}
                }}
                className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded border gap-2 ${isFavorite ? 'bg-gold/15 border-gold/30' : 'bg-surface border-borderLight'}`}
              >
                <Heart size={18} color={isFavorite ? C.gold : C.textMuted} fill={isFavorite ? C.gold : "transparent"} />
                <Text style={{ fontFamily: FONT_MONO }} className={`uppercase tracking-wider text-xs ${isFavorite ? 'text-gold' : 'text-textMuted'}`}>
                  Favorite
                </Text>
              </Pressable>

              <Pressable 
                onPress={async () => {
                  try {
                    if (!backlogItem) {
                      await onSetStatus("want_to_play");
                    }
                  } catch {}
                }}
                className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded border gap-2 ${backlogItem ? 'bg-gold/15 border-gold/30' : 'bg-surface border-borderLight'}`}
              >
                <Bookmark size={18} color={backlogItem ? C.gold : C.textMuted} />
                <Text style={{ fontFamily: FONT_MONO }} className={`uppercase tracking-wider text-xs ${backlogItem ? 'text-gold' : 'text-textMuted'}`}>
                  {backlogItem ? 'In Backlog' : 'Wishlist'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* WRITE REVIEW BANNER */}
          <View className="p-4 rounded-xl border border-borderLight bg-surface relative overflow-hidden">
            <CornerMarkers size={16} color={C.borderLight} />
            <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text mb-2">Ready to share your experience?</Text>
            <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted leading-relaxed mb-4">
              Head over to the full review editor to capture your thoughts, rating, and playtime in one place.
            </Text>
            <Button
              label="Write a Review"
              onPress={() => router.push({ pathname: "/review/new", params: { gameId: `${game._id}` } })}
            />
          </View>

          {/* SUMMARY */}
          {game.summary && (
            <View className="p-4 rounded-xl border border-borderLight bg-surface relative">
              <CornerMarkers size={12} color={C.borderLight} />
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text mb-3">Summary</Text>
              <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted leading-relaxed">
                {game.summary}
              </Text>
            </View>
          )}

          {/* ABOUT THIS GAME */}
          <View className="p-4 rounded-xl border border-borderLight bg-surface gap-4">
            <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">About This Game</Text>
            
            {genreNames.length > 0 && (
              <View className="gap-2">
                <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase tracking-widest">Genres</Text>
                <View className="flex-row flex-wrap gap-2">
                  {genreNames.map((g, i) => (
                    <View key={`${g}-${i}`} className="px-3 py-1.5 rounded-full bg-gold/20 border border-gold/30">
                      <Text style={{ fontFamily: FONT_BODY }} className="text-xs text-gold font-medium">{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {developerNames.length > 0 && (
              <View className="gap-2">
                <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase tracking-widest">Developers</Text>
                <View className="flex-row flex-wrap gap-2">
                  {developerNames.map((c, i) => (
                    <View key={`${c}-${i}`} className="px-2 py-1 rounded border border-borderLight bg-bg">
                      <Text style={{ fontFamily: FONT_BODY }} className="text-xs text-text">{c} <Text className="text-textDim">· Developer</Text></Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {publisherNames.length > 0 && (
              <View className="gap-2">
                <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase tracking-widest">Publishers</Text>
                <View className="flex-row flex-wrap gap-2">
                  {publisherNames.map((c, i) => (
                    <View key={`${c}-${i}`} className="px-2 py-1 rounded border border-borderLight bg-bg">
                      <Text style={{ fontFamily: FONT_BODY }} className="text-xs text-text">{c} <Text className="text-textDim">· Publisher</Text></Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* RELATED CONTENT */}
          <Pressable 
            onPress={() => void onFetchRelated()}
            className="flex-row items-center justify-between p-4 rounded-xl border border-borderLight bg-surface"
          >
            <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Related Content</Text>
            <View className="flex-row items-center gap-3">
              <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted">
                {isFetchingRelated ? "Loading..." : (relatedItems.length ? `${relatedItems.length} items` : "Load")}
              </Text>
              <ChevronDown size={20} color={C.textMuted} style={{ transform: [{ rotate: showRelated ? '180deg' : '0deg' }] }} />
            </View>
          </Pressable>
          
          {showRelated && relatedItems.length > 0 && (
            <View className="gap-2">
              {relatedItems.map(item => (
                <View key={item.id} className="p-3 border-b border-borderLight bg-bgAlt flex-row justify-between items-start gap-3">
                  <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-text flex-1" numberOfLines={2}>{item.title}</Text>
                  <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase flex-shrink-0 mt-0.5">{item.category.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          )}

          {/* COMMUNITY REVIEWS */}
          <View className="p-4 rounded-xl border border-borderLight bg-surface gap-4">
            <View className="flex-row justify-between items-center">
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Community Reviews</Text>
              <Pressable onPress={() => router.push({ pathname: "/review/new", params: { gameId: `${game._id}` } })}>
                <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-gold">Write a Review →</Text>
              </Pressable>
            </View>

            {reviews.length === 0 ? (
              <View className="py-8 items-center">
                <PenLine size={32} color={C.textDim} />
                <Text style={{ fontFamily: FONT_BODY }} className="text-textMuted mt-2">No reviews yet.</Text>
              </View>
            ) : (
              <View className="gap-4">
                {reviews.map((review) => {
                  const reviewId = toIdString(review._id);
                  return (
                    <ReviewCard
                      key={`${review._id}`}
                      title={review.game.title}
                      rating={review.rating}
                      authorName={review.author.name}
                      authorUsername={review.author.username}
                      excerpt={review.text}
                      coverUrl={review.game.coverUrl}
                      likeCount={review.likeCount}
                      commentCount={review.commentCount}
                      createdAt={review._creationTime}
                      onPress={() => {
                        if (reviewId) {
                          router.push({ pathname: "/review/[id]", params: { id: reviewId } });
                        }
                      }}
                    />
                  );
                })}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
