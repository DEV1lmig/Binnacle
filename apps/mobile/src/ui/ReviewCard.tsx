import { Pressable, StyleSheet, View } from "react-native";
import { Body, Card } from "./primitives";
import { colors, spacing } from "./theme";
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
  onPress,
}: ReviewCardProps) {
  const stars = ratingToFiveStar(rating);
  const starLabel = `\u2605`.repeat(Math.round(stars)) || "-";

  return (
    <Pressable disabled={!onPress} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Body style={styles.title}>{title}</Body>
          <Body style={styles.rating}>{rating.toFixed(1)}/10</Body>
        </View>

        <Body style={styles.stars}>{starLabel}</Body>

        <Body style={styles.author}>
          {authorName} @{authorUsername}
        </Body>

        {excerpt ? <Body numberOfLines={3}>{excerpt}</Body> : null}

        <View style={styles.metaRow}>
          <Body style={styles.metaText}>{likeCount ?? 0} likes</Body>
          <Body style={styles.metaText}>{commentCount ?? 0} comments</Body>
          {createdAt ? <Body style={styles.metaText}>{formatDate(createdAt)}</Body> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  rating: {
    color: colors.accent,
    fontWeight: "700",
  },
  stars: {
    color: colors.warning,
    letterSpacing: 1,
  },
  author: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
