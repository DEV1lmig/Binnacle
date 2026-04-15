import { Pressable, StyleSheet, View } from "react-native";
import { Body, Card } from "./primitives";
import { colors, spacing } from "./theme";

type GameTileProps = {
  title: string;
  releaseYear?: number;
  rating?: number;
  subtitle?: string;
  onPress?: () => void;
};

export function GameTile({ title, releaseYear, rating, subtitle, onPress }: GameTileProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <Body style={styles.title}>{title}</Body>
          {rating !== undefined ? <Body style={styles.rating}>{rating.toFixed(1)}</Body> : null}
        </View>
        <View style={styles.metaRow}>
          {releaseYear ? <Body style={styles.metaText}>{releaseYear}</Body> : null}
          {subtitle ? <Body style={styles.metaText}>{subtitle}</Body> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  rating: {
    color: colors.accent,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
