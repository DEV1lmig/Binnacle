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
      <View className="px-4 py-3 flex-row items-center">
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/"); }} className="flex-row items-center gap-2">
          <Text style={{ fontFamily: FONT_MONO }} className="text-textMuted uppercase text-xs tracking-widest">&lt; Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-4 gap-6 pb-32">
        
        {/* REVIEW CARD */}
        <View className="p-4 rounded-xl border border-borderLight bg-surface">
          {/* Author & Rating */}
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-surface border border-borderLight items-center justify-center">
                <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-white">
                  {review.author.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontFamily: FONT_HEADING }} className="text-lg text-text leading-tight">{review.author.name}</Text>
                <Text style={{ fontFamily: FONT_MONO }} className="text-[10px] text-textMuted uppercase tracking-wider mt-1">{formatDate(review._creationTime)}</Text>
              </View>
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text style={{ fontFamily: FONT_HEADING }} className="text-2xl text-gold leading-none">{review.rating.toFixed(1)}</Text>
              <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textDim leading-none">/10</Text>
            </View>
          </View>

          {/* Game Info inline */}
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-16 h-24 rounded border border-borderLight overflow-hidden bg-bgAlt">
              {review.game.coverUrl && (
                <Image source={{ uri: review.game.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              )}
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">{review.game.title}</Text>
              <Pressable onPress={() => router.push(`/game/${review.game._id}`)} className="mt-1">
                <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-gold">View Game Details →</Text>
              </Pressable>
            </View>
          </View>

          <View className="h-px bg-borderLight mb-4" />

          {/* Text */}
          <Text style={{ fontFamily: FONT_BODY }} className="text-base text-text leading-relaxed mb-6">
            {review.text}
          </Text>

          <View className="h-px bg-borderLight mb-4" />

          {/* Actions */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-6">
              <Pressable 
                onPress={() => void toggleLike({ reviewId })}
                className="flex-row items-center gap-2"
              >
                <Heart size={20} color={review.viewerHasLiked ? C.red : C.textMuted} fill={review.viewerHasLiked ? C.red : "transparent"} />
                <Text style={{ fontFamily: FONT_MONO }} className={`text-xs ${review.viewerHasLiked ? "text-red" : "text-textMuted"}`}>{review.likeCount}</Text>
              </Pressable>
              
              <View className="flex-row items-center gap-2">
                <MessageSquare size={20} color={C.textMuted} />
                <Text style={{ fontFamily: FONT_MONO }} className="text-xs text-textMuted">{review.commentCount}</Text>
              </View>
            </View>

            <Pressable 
              onPress={() => setShareOpen(true)}
              className="flex-row items-center gap-2"
            >
              <Share2 size={18} color={C.textMuted} />
              <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted">Share</Text>
            </Pressable>
          </View>
        </View>

        {/* COMMENTS */}
        <View className="p-4 rounded-xl border border-borderLight bg-surface gap-4">
          <Text style={{ fontFamily: FONT_HEADING }} className="text-xl text-text">Comments ({comments.length})</Text>
          
          {/* Composer */}
          <View className="flex-row gap-3 items-start">
            <View className="w-8 h-8 rounded-full bg-surface border border-borderLight items-center justify-center mt-1">
               <Text style={{ fontFamily: FONT_HEADING }} className="text-sm text-white">
                  {currentUser?.name[0]?.toUpperCase() || "?"}
                </Text>
            </View>
            <View className="flex-1 gap-2">
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
          <View className="mt-4 gap-4">
            {comments.map((comment) => (
              <View key={`${comment._id}`} className="flex-row gap-3">
                <View className="w-8 h-8 rounded-full bg-bgAlt border border-borderLight items-center justify-center">
                  <Text style={{ fontFamily: FONT_HEADING }} className="text-xs text-text">
                    {comment.author.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 bg-bg rounded p-3 border border-borderLight">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-text font-medium">{comment.author.name}</Text>
                    <Text style={{ fontFamily: FONT_MONO }} className="text-[9px] text-textDim uppercase">{formatDate(comment._creationTime)}</Text>
                  </View>
                  <Text style={{ fontFamily: FONT_BODY }} className="text-sm text-textMuted leading-relaxed">{comment.text}</Text>
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
