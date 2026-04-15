import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, EmptyState, Heading, Screen } from "@/src/ui/primitives";
import { GameTile } from "@/src/ui/GameTile";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "want_to_play", label: "Want" },
  { key: "playing", label: "Playing" },
  { key: "completed", label: "Done" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
] as const;

export default function BacklogTab() {
  const router = useRouter();
  const currentUser = useQuery(api.users.current);
  const removeByGameId = useMutation(api.backlog.removeByGameId);

  const [activeStatus, setActiveStatus] = useState<(typeof STATUSES)[number]["key"]>("all");

  const backlog = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id, limit: 100 } : "skip"
  );

  const filteredItems = useMemo(() => {
    if (!backlog) {
      return [];
    }

    if (activeStatus === "all") {
      return backlog;
    }

    return backlog.filter((item) => item.status === activeStatus);
  }, [activeStatus, backlog]);

  if (currentUser === undefined || backlog === undefined) {
    return <LoadingState label="Loading backlog..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Backlog</Heading>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {STATUSES.map((status) => (
            <Button
              key={status.key}
              label={status.label}
              variant={activeStatus === status.key ? "primary" : "secondary"}
              onPress={() => setActiveStatus(status.key)}
            />
          ))}
        </ScrollView>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="Your backlog is empty"
            description="Add games from Discover or from game detail pages."
          />
        ) : (
          filteredItems.map((item) => (
            <View key={`${item._id}`} style={styles.row}>
              <GameTile
                title={item.game?.title ?? "Untitled Game"}
                releaseYear={item.game?.releaseYear}
                rating={item.game?.aggregatedRating}
                subtitle={item.status.replace(/_/g, " ")}
                onPress={() => router.push({ pathname: "/game/[id]", params: { id: `${item.gameId}` } })}
              />
              <Button
                label="Remove"
                variant="danger"
                onPress={() => {
                  void removeByGameId({ gameId: item.gameId });
                }}
              />
            </View>
          ))
        )}

        <Body style={styles.caption}>Tip: tap a game to update its status from the detail screen.</Body>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 100,
  },
  filters: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  caption: {
    fontSize: 12,
  },
});
