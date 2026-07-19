import { useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { ShareReviewSheet } from "@/src/features/share/ShareReviewSheet";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { Image } from "@/src/tw/image";
import { Heart, MessageSquare, Share2, MoreHorizontal } from "lucide-react-native";
import { formatDate } from "@/src/lib/format";

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = params.id as Id<"reviews"> | undefined;

  const [commentText, setCommentText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  const currentUser = useQuery(api.users.current);
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
    <Screen edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/"); }} className="flex-row items-center" style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted uppercase tracking-widest">&lt; Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}>

        {/* REVIEW CARD */}
        <View className="border border-borderLight bg-surface" style={{ padding: 16, borderRadius: 12 }}>
          {/* Author & Rating */}
          <View className="flex-row justify-between items-start" style={{ marginBottom: 24 }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className="rounded-full bg-surface border border-borderLight items-center justify-center" style={{ width: 48, height: 48 }}>
                <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-white">
                  {review.author.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontFamily: FONT_HEADING, lineHeight: 18 }} className="text-base text-text">{review.author.name}</Text>
                <Text style={{ fontFamily: FONT_MONO, marginTop: 4 }} className="text-xs text-textMuted uppercase tracking-wider">{formatDate(review._creationTime)}</Text>
              </View>
            </View>
            <View className="flex-row items-baseline" style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-gold">{review.rating.toFixed(1)}</Text>
              <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim">/10</Text>
            </View>
          </View>

          {/* Game Info inline */}
          <View className="flex-row items-center" style={{ gap: 16, marginBottom: 24 }}>
            <View className="border border-borderLight overflow-hidden bg-bgAlt" style={{ width: 64, height: 96, borderRadius: 4 }}>
              {review.game.coverUrl && (
                <Image source={{ uri: review.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              )}
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: FONT_HEADING }} className="text-lg text-text">{review.game.title}</Text>
              <Pressable onPress={() => router.push(`/game/${review.game._id}`)} style={{ marginTop: 4 }}>
                <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-gold">View Game Details →</Text>
              </Pressable>
            </View>
          </View>

          <View className="bg-borderLight" style={{ height: 1, marginBottom: 16 }} />

          {/* Text */}
          <Text style={{ fontFamily: FONT_BODY, marginBottom: 16 }} className="text-sm leading-relaxed text-text">
            {review.text}
          </Text>

          <View className="bg-borderLight" style={{ height: 1, marginBottom: 16 }} />

          {/* Actions */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 24 }}>
              <Pressable
                onPress={() => void toggleLike({ reviewId })}
                className="flex-row items-center"
                style={{ gap: 8 }}
              >
                <Heart size={20} color={review.viewerHasLiked ? C.red : C.textMuted} fill={review.viewerHasLiked ? C.red : "transparent"} />
                <Text style={{ fontFamily: FONT_MONO }} className={`text-xs ${review.viewerHasLiked ? "text-red" : "text-textMuted"}`}>{review.likeCount}</Text>
              </Pressable>

              <View className="flex-row items-center" style={{ gap: 8 }}>
                <MessageSquare size={20} color={C.textMuted} />
                <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted">{review.commentCount}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShareOpen(true)}
              className="flex-row items-center"
              style={{ gap: 8 }}
            >
              <Share2 size={16} color={C.textMuted} />
              <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted">Share</Text>
            </Pressable>
          </View>
        </View>

        {/* COMMENTS */}
        <View className="border border-borderLight bg-surface" style={{ padding: 16, borderRadius: 12, gap: 16 }}>
          <Text style={{ fontFamily: FONT_HEADING }} className="text-lg text-text">Comments ({comments.length})</Text>

          {/* Composer */}
          <View className="flex-row items-start" style={{ gap: 12 }}>
            <View className="rounded-full bg-surface border border-borderLight items-center justify-center" style={{ width: 32, height: 32, marginTop: 4 }}>
                <Text style={{ fontFamily: FONT_HEADING }} className="text-sm text-white">
                  {currentUser?.name[0]?.toUpperCase() || "?"}
                </Text>
            </View>
            <View className="flex-1" style={{ gap: 8 }}>
              <Input
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                multiline
                style={{ minHeight: 80 }}
              />
              <View className="items-end">
                <Button
                  label="Post"
                  onPress={() => {
                    if (!canSubmitComment) return;
                    void createComment({ reviewId, text: commentText.trim() });
                    setCommentText("");
                  }}
                  disabled={!canSubmitComment}
                />
              </View>
            </View>
          </View>

          {/* Comment List */}
          <View style={{ marginTop: 16, gap: 16 }}>
            {comments.map((comment) => (
              <View key={`${comment._id}`} className="flex-row" style={{ gap: 12 }}>
                <View className="rounded-full bg-bgAlt border border-borderLight items-center justify-center" style={{ width: 32, height: 32 }}>
                  <Text style={{ fontFamily: FONT_HEADING }} className="text-xs text-text">
                    {comment.author.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 bg-bg border border-borderLight" style={{ borderRadius: 4, padding: 12 }}>
                  <View className="flex-row justify-between items-center" style={{ marginBottom: 4 }}>
                    <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-text font-medium">{comment.author.name}</Text>
                    <Text style={{ fontFamily: FONT_MONO, fontSize: 9 }} className="text-textDim uppercase">{formatDate(comment._creationTime)}</Text>
                  </View>
                  <Text style={{ fontFamily: FONT_BODY }} className="text-sm leading-relaxed text-textMuted">{comment.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      <ShareReviewSheet
        reviewId={`${review._id}`}
        gameTitle={review.game.title}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </Screen>
  );
}
