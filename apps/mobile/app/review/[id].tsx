import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";

export default function ReviewDetailPage() {
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = params.id as Id<"reviews"> | undefined;

  const [commentText, setCommentText] = useState("");

  const review = useQuery(api.reviews.get, reviewId ? { reviewId } : "skip");
  const comments = useQuery(api.comments.listForReview, reviewId ? { reviewId, limit: 100 } : "skip");
  const toggleLike = useMutation(api.likes.toggle);
  const createComment = useMutation(api.comments.create);

  const canSubmitComment = useMemo(() => commentText.trim().length > 0, [commentText]);

  if (!reviewId || review === undefined || comments === undefined) {
    return <LoadingState label="Loading review..." />;
  }

  if (!review) {
    return (
      <Screen>
        <Heading>Review not found</Heading>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Review</Heading>

        <ReviewCard
          title={review.game.title}
          rating={review.rating}
          authorName={review.author.name}
          authorUsername={review.author.username}
          excerpt={review.text}
          likeCount={review.likeCount}
          commentCount={review.commentCount}
          createdAt={review._creationTime}
        />

        <View style={styles.actions}>
          <Button
            label={review.viewerHasLiked ? "Unlike" : "Like"}
            onPress={() => {
              void toggleLike({ reviewId });
            }}
            variant={review.viewerHasLiked ? "secondary" : "primary"}
          />
        </View>

        <View style={styles.commentComposer}>
          <Input
            label="Add a comment"
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Share your thoughts"
          />
          <Button
            label="Post comment"
            onPress={() => {
              if (!canSubmitComment) {
                return;
              }

              void createComment({ reviewId, text: commentText.trim() });
              setCommentText("");
            }}
            disabled={!canSubmitComment}
          />
        </View>

        <View style={styles.commentsSection}>
          <Body style={styles.sectionTitle}>Comments</Body>
          {comments.map((comment) => (
            <View key={`${comment._id}`} style={styles.commentCard}>
              <Body style={styles.commentAuthor}>@{comment.author.username}</Body>
              <Body>{comment.text}</Body>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 64,
  },
  actions: {
    flexDirection: "row",
  },
  commentComposer: {
    gap: spacing.sm,
  },
  commentsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  commentCard: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2d3b66",
    backgroundColor: "#131a30",
  },
  commentAuthor: {
    fontWeight: "700",
  },
});
