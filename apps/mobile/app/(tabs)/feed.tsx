import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Button, EmptyState, Heading, Screen } from "@/src/ui/primitives";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

export default function FeedTab() {
  const router = useRouter();
  const toggleLike = useMutation(api.likes.toggle);
  const timeline = useQuery(api.feed.timeline, { limit: 30 });

  const entries = useMemo(() => {
    if (!timeline) {
      return [];
    }

    return [...timeline.friends, ...timeline.community].sort(
      (a, b) => b.review._creationTime - a.review._creationTime
    );
  }, [timeline]);

  if (timeline === undefined) {
    return <LoadingState label="Loading feed..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Feed</Heading>

        {entries.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Follow more players or add reviews to populate your feed."
          />
        ) : (
          entries.map((entry) => {
            const reviewId = toIdString(entry.review._id);
            const gameId = toIdString(entry.game._id);

            return (
              <View key={`${entry.review._id}`} style={styles.cardWrap}>
                <ReviewCard
                  title={entry.game.title}
                  rating={entry.review.rating}
                  authorName={entry.author.name}
                  authorUsername={entry.author.username}
                  excerpt={entry.review.text}
                  likeCount={entry.likeCount}
                  commentCount={entry.commentCount}
                  createdAt={entry.review._creationTime}
                  onPress={() => {
                    if (reviewId) {
                      router.push({ pathname: "/review/[id]", params: { id: reviewId } });
                    }
                  }}
                />

                <View style={styles.actions}>
                  <Button
                    label={entry.viewerHasLiked ? "Unlike" : "Like"}
                    variant={entry.viewerHasLiked ? "secondary" : "primary"}
                    onPress={() => {
                      if (reviewId) {
                        void toggleLike({ reviewId: entry.review._id });
                      }
                    }}
                  />
                  <Button
                    label="Game"
                    variant="secondary"
                    onPress={() => {
                      if (gameId) {
                        router.push({ pathname: "/game/[id]", params: { id: gameId } });
                      }
                    }}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 100,
  },
  cardWrap: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
