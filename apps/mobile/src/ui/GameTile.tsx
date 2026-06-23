import { Pressable, StyleSheet, View, Image } from "react-native";
import { Star } from "lucide-react-native";
import { Body, Card } from "./primitives";
import { colors, radius, spacing } from "./theme";

type GameTileProps = {
  title: string;
  releaseYear?: number;
  rating?: number;
  subtitle?: string;
  coverUrl?: string;
  variant?: "default" | "poster";
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  onPress?: () => void;
};

export function GameTile({ title, releaseYear, rating, subtitle, coverUrl, variant = "default", style, onPress }: GameTileProps) {
  const formattedCoverUrl = coverUrl?.startsWith("//") ? `https:${coverUrl}` : coverUrl;

  if (variant === "poster") {
    return (
      <Pressable 
        onPress={onPress} 
        disabled={!onPress}
        style={({ pressed }) => [
          style,
          styles.posterContainer,
          pressed && styles.pressed
        ]}
      >
        {formattedCoverUrl ? (
          <Image source={{ uri: formattedCoverUrl }} style={styles.posterImage} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Body style={styles.posterPlaceholderText} numberOfLines={2}>{title}</Body>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable 
      onPress={onPress} 
      disabled={!onPress}
      style={({ pressed }) => [
        style,
        pressed && styles.pressed
      ]}
    >
      <Card style={styles.card}>
        {formattedCoverUrl ? (
          <Image source={{ uri: formattedCoverUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        <View style={styles.contentWrap}>
          <View style={styles.titleRow}>
            <Body style={styles.title} numberOfLines={1}>{title}</Body>
            {rating !== undefined ? (
              <View style={styles.ratingWrap}>
                <Star size={12} color={colors.accent} fill={colors.accent} />
                <Body style={styles.rating}>{rating.toFixed(1)}</Body>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {releaseYear ? <Body style={styles.metaText} numberOfLines={1}>{releaseYear}</Body> : null}
            {subtitle ? <Body style={styles.metaText} numberOfLines={1}>{subtitle}</Body> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  posterContainer: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
  },
  posterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  posterPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  coverImage: {
    width: 64,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  coverPlaceholder: {
    width: 64,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  contentWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  rating: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
});
