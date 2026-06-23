import { Pressable, StyleSheet, View, Image } from "react-native";
import { Heart, MessageSquare } from "lucide-react-native";
import { Body, Card } from "./primitives";
import { colors, spacing, radius } from "./theme";
import { formatDate, ratingToFiveStar } from "@/src/lib/format";

type ReviewCardProps = {
  title: string;
  rating: number;
  authorName: string;
  authorUsername: string;
  excerpt?: string;
  likeCount?: number;
  commentCount?: number;
  createdAt?: number;
  coverUrl?: string;
  onPress?: () => void;
};

export function ReviewCard({
  title,
  rating,
  authorName,
  authorUsername,
  excerpt,
  likeCount,
  commentCount,
  createdAt,
  coverUrl,
  onPress,
}: ReviewCardProps) {
  const stars = ratingToFiveStar(rating);
  const starLabel = `\u2605`.repeat(Math.round(stars)) || "-";
  const formattedCoverUrl = coverUrl?.startsWith("//") ? `https:${coverUrl}` : coverUrl;

  return (
    <Pressable disabled={!onPress} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.headerLayout}>
          {formattedCoverUrl ? (
            <Image source={{ uri: formattedCoverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : null}
          <View style={styles.headerInfo}>
            <Body style={styles.author} numberOfLines={1}>
              <Body style={styles.authorName}>{authorName}</Body> reviewed
            </Body>
            
            <Body style={styles.title} numberOfLines={1}>{title}</Body>

            <View style={styles.ratingRow}>
              <Body style={styles.stars}>{starLabel}</Body>
              <Body style={styles.rating}>{rating.toFixed(1)}</Body>
            </View>
          </View>
        </View>

        {excerpt ? <Body numberOfLines={4} style={styles.reviewText}>{excerpt}</Body> : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Heart size={14} color={colors.textSecondary} />
            <Body style={styles.metaText}>{likeCount ?? 0}</Body>
          </View>
          <View style={styles.metaItem}>
            <MessageSquare size={14} color={colors.textSecondary} />
            <Body style={styles.metaText}>{commentCount ?? 0}</Body>
          </View>
          {createdAt ? <Body style={styles.dateText}>{formatDate(createdAt)}</Body> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0, // sleeker dark look
  },
  headerLayout: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  coverImage: {
    width: 48,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  author: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  authorName: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  rating: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  stars: {
    color: colors.success,
    letterSpacing: 2,
    fontSize: 12,
  },
  reviewText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: "auto",
  },
});
