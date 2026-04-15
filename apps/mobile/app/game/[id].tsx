import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Body, Button, EmptyState, Heading, Screen } from "@/src/ui/primitives";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

const BACKLOG_STATUSES = [
  { key: "want_to_play", label: "Want to Play" },
  { key: "playing", label: "Playing" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
] as const;

export default function GameDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const gameId = params.id as Id<"games"> | undefined;

  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  const [relatedItems, setRelatedItems] = useState<Array<{ id: number; title: string; category: string; releaseDate?: number }>>([]);

  const game = useQuery(api.games.getById, gameId ? { gameId } : "skip");
  const backlogItem = useQuery(
    api.backlog.getForCurrentUserAndGame,
    gameId ? { gameId } : "skip"
  );
  const reviews = useQuery(api.reviews.listForGame, gameId ? { gameId, limit: 30 } : "skip");

  const addToBacklog = useMutation(api.backlog.add);
  const removeFromBacklog = useMutation(api.backlog.removeByGameId);
  const fetchRelatedContent = useAction(api.igdb.fetchRelatedContent);

  if (!gameId || game === undefined || backlogItem === undefined || reviews === undefined) {
    return <LoadingState label="Loading game..." />;
  }

  if (!game) {
    return (
      <Screen>
        <EmptyState title="Game not found" description="This game may have been removed or is unavailable." />
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
    try {
      setIsFetchingRelated(true);
      const data = await fetchRelatedContent({ gameTitle: game.title, igdbId: game.igdbId });
      setRelatedItems(Array.isArray(data) ? data : []);
    } finally {
      setIsFetchingRelated(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{game.title}</Heading>
        <View style={styles.meta}>
          {game.releaseYear ? <Body>{game.releaseYear}</Body> : null}
          {game.aggregatedRating ? <Body>{game.aggregatedRating.toFixed(1)} / 100</Body> : null}
          {game.genres ? <Body numberOfLines={2}>{game.genres}</Body> : null}
        </View>
        {game.summary ? <Body>{game.summary}</Body> : null}

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Backlog</Body>
          <View style={styles.statusGrid}>
            {BACKLOG_STATUSES.map((status) => (
              <Button
                key={status.key}
                label={status.label}
                variant={backlogItem?.status === status.key ? "primary" : "secondary"}
                loading={loadingStatus === status.key}
                onPress={() => {
                  void onSetStatus(status.key);
                }}
              />
            ))}
          </View>
          {backlogItem ? (
            <Button
              label="Remove from Backlog"
              variant="danger"
              onPress={() => {
                void removeFromBacklog({ gameId });
              }}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Related Content</Body>
          <Button
            label={isFetchingRelated ? "Loading..." : "Load Related Content"}
            variant="secondary"
            loading={isFetchingRelated}
            onPress={() => {
              void onFetchRelated();
            }}
          />
          {relatedItems.map((item) => (
            <View key={`${item.id}`} style={styles.relatedRow}>
              <Body style={styles.relatedTitle}>{item.title}</Body>
              <Body style={styles.relatedMeta}>
                {item.category.replace(/_/g, " ")}
                {item.releaseDate ? ` • ${item.releaseDate}` : ""}
              </Body>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Reviews</Body>
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" description="Be the first to log and review this game." />
          ) : (
            reviews.map((review) => {
              const reviewId = toIdString(review._id);

              return (
                <ReviewCard
                  key={`${review._id}`}
                  title={review.game.title}
                  rating={review.rating}
                  authorName={review.author.name}
                  authorUsername={review.author.username}
                  excerpt={review.text}
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
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 90,
  },
  meta: {
    gap: 4,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusGrid: {
    gap: spacing.xs,
  },
  relatedRow: {
    gap: 2,
    borderWidth: 1,
    borderColor: "#2d3b66",
    borderRadius: 10,
    padding: spacing.sm,
  },
  relatedTitle: {
    color: "#f3f5ff",
    fontWeight: "600",
  },
  relatedMeta: {
    fontSize: 12,
  },
});
