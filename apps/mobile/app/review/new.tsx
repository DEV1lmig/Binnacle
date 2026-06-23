import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Body, Button, Heading, Input, Screen, SectionTag } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { colors, spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

const BACKLOG_STATUS_OPTIONS = [
  { key: "none", label: "No Backlog Change" },
  { key: "want_to_play", label: "Want to Play" },
  { key: "playing", label: "Playing" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
] as const;

export default function NewReviewPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();

  const initialGameId = params.gameId as Id<"games"> | undefined;

  const [selectedGameId, setSelectedGameId] = useState<Id<"games"> | null>(initialGameId ?? null);
  const [selectedGameTitle, setSelectedGameTitle] = useState<string>("");
  const [gameSearch, setGameSearch] = useState("");
  const [rating, setRating] = useState("8");
  const [platform, setPlatform] = useState("");
  const [playtimeHours, setPlaytimeHours] = useState("");
  const [text, setText] = useState("");
  const [selectedBacklogStatus, setSelectedBacklogStatus] =
    useState<(typeof BACKLOG_STATUS_OPTIONS)[number]["key"]>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialGame = useQuery(
    api.games.getById,
    selectedGameId ? { gameId: selectedGameId } : "skip"
  );

  const gameSearchResults = useQuery(
    api.games.searchCached,
    gameSearch.trim().length > 0 ? { query: gameSearch.trim(), limit: 10 } : "skip"
  );

  const createReview = useMutation(api.reviews.create);
  const addToBacklog = useMutation(api.backlog.add);

  const resolvedGameTitle = useMemo(() => {
    if (initialGame?.title) {
      return initialGame.title;
    }
    return selectedGameTitle;
  }, [initialGame, selectedGameTitle]);

  if (initialGameId && initialGame === undefined) {
    return <LoadingState label="Loading game..." />;
  }

  const onSubmit = async () => {
    if (!selectedGameId) {
      Alert.alert("Select a game", "Pick a game before posting your review.");
      return;
    }

    const ratingValue = Number(rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 10) {
      Alert.alert("Invalid rating", "Rating must be a number between 1 and 10.");
      return;
    }

    const playtimeValue = playtimeHours.trim() ? Number(playtimeHours) : undefined;
    if (playtimeValue !== undefined && (!Number.isFinite(playtimeValue) || playtimeValue < 0)) {
      Alert.alert("Invalid playtime", "Playtime must be a non-negative number.");
      return;
    }

    try {
      setIsSubmitting(true);
      const reviewId = await createReview({
        gameId: selectedGameId,
        rating: ratingValue,
        platform: platform.trim() ? platform.trim() : undefined,
        text: text.trim() ? text.trim() : undefined,
        playtimeHours: playtimeValue,
      });

      if (selectedBacklogStatus !== "none") {
        await addToBacklog({
          gameId: selectedGameId,
          status: selectedBacklogStatus,
        });
      }

      const id = toIdString(reviewId);
      if (id) {
        router.replace({ pathname: "/review/[id]", params: { id } });
      } else {
        router.replace("/(tabs)/feed");
      }
    } catch (error: any) {
      Alert.alert("Could not create review", error?.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Write Review</Heading>

        <View style={styles.section}>
          <SectionTag label="Game" color={colors.accent} />
          {selectedGameId ? (
            <View style={styles.selectedGameCard}>
              <Body style={styles.selectedGameTitle}>{resolvedGameTitle || "Selected game"}</Body>
              <Button
                label="Clear"
                variant="secondary"
                onPress={() => {
                  setSelectedGameId(null);
                  setSelectedGameTitle("");
                }}
              />
            </View>
          ) : null}
          <Input
            label="Search games"
            value={gameSearch}
            onChangeText={setGameSearch}
            placeholder="Type a game title"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {(gameSearchResults ?? []).map((game) => (
            <View key={`${game._id}`} style={styles.searchResultRow}>
              <Body style={styles.resultTitle}>{game.title}</Body>
              <Button
                label="Select"
                variant="secondary"
                onPress={() => {
                  setSelectedGameId(game._id);
                  setSelectedGameTitle(game.title);
                  setGameSearch("");
                }}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionTag label="Review Details" color={colors.warning} />
          <Input label="Rating (1-10)" value={rating} onChangeText={setRating} keyboardType="decimal-pad" />
          <Input label="Platform (optional)" value={platform} onChangeText={setPlatform} placeholder="PC, PS5, Switch..." />
          <Input
            label="Playtime hours (optional)"
            value={playtimeHours}
            onChangeText={setPlaytimeHours}
            keyboardType="decimal-pad"
            placeholder="e.g. 24"
          />
          <Input
            label="Review text (optional)"
            value={text}
            onChangeText={setText}
            placeholder="What stood out to you?"
            multiline
          />
        </View>

        <View style={styles.section}>
          <SectionTag label="Backlog Status (Optional)" color={colors.success} />
          <View style={styles.statusGrid}>
            {BACKLOG_STATUS_OPTIONS.map((option) => (
              <Button
                key={option.key}
                label={option.label}
                variant={selectedBacklogStatus === option.key ? "primary" : "secondary"}
                onPress={() => setSelectedBacklogStatus(option.key)}
              />
            ))}
          </View>
        </View>

        <Button label="Publish Review" loading={isSubmitting} onPress={() => void onSubmit()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 100,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  selectedGameCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  selectedGameTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  searchResultRow: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  statusGrid: {
    gap: spacing.xs,
  },
});
