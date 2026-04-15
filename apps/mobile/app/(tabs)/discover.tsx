import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { GameTile } from "@/src/ui/GameTile";
import { UserRow } from "@/src/ui/UserRow";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

type SearchResult = {
  _id?: unknown;
  convexId?: unknown;
  title?: string;
  releaseYear?: number;
  aggregatedRating?: number;
};

export default function DiscoverTab() {
  const router = useRouter();
  const searchAction = useAction(api.igdb.searchOptimizedWithFallback);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const discoverPeople = useQuery(api.users.search, { query: "", limit: 8 });
  const trendingData = useQuery(api.games.getTrendingGames, { limit: 8 });
  const topData = useQuery(api.games.getTopRatedGames, { limit: 8 });
  const newData = useQuery(api.games.getNewReleases, { limit: 8 });

  const isLoadingCollections =
    discoverPeople === undefined ||
    trendingData === undefined ||
    topData === undefined ||
    newData === undefined;

  const trending = useMemo(() => trendingData?.games ?? [], [trendingData]);
  const topRated = useMemo(() => topData?.games ?? [], [topData]);
  const newReleases = useMemo(() => newData?.games ?? [], [newData]);

  const onSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchAction({
        query: trimmed,
        limit: 20,
        minCachedResults: 8,
      });
      const list = Array.isArray(response?.results) ? (response.results as SearchResult[]) : [];
      setResults(list);
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoadingCollections) {
    return <LoadingState label="Loading discovery..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Discover</Heading>

        <View style={styles.searchWrap}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search games"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label={isSearching ? "Searching..." : "Search"} onPress={() => void onSearch()} />
        </View>

        {results.length > 0 ? (
          <View style={styles.section}>
            <Body style={styles.sectionTitle}>Search Results</Body>
            {results.map((game, index) => {
              const gameId = toIdString(game.convexId) ?? toIdString(game._id);
              return (
                <GameTile
                  key={`${gameId ?? game.title ?? "result"}-${index}`}
                  title={game.title ?? "Untitled Game"}
                  releaseYear={game.releaseYear}
                  rating={game.aggregatedRating}
                  onPress={() => {
                    if (gameId) {
                      router.push({ pathname: "/game/[id]", params: { id: gameId } });
                    }
                  }}
                />
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>People</Body>
          {(discoverPeople ?? []).map((user) => (
            <UserRow
              key={`${user._id}`}
              name={user.name}
              username={user.username}
              onPress={() => router.push({ pathname: "/user/[username]", params: { username: user.username } })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Trending</Body>
          {trending.map((game) => (
            <GameTile
              key={`${game._id}`}
              title={game.title}
              releaseYear={game.releaseYear}
              rating={game.aggregatedRating}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: `${game._id}` } })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Top Rated</Body>
          {topRated.map((game) => (
            <GameTile
              key={`${game._id}`}
              title={game.title}
              releaseYear={game.releaseYear}
              rating={game.aggregatedRating}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: `${game._id}` } })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>New Releases</Body>
          {newReleases.map((game) => (
            <GameTile
              key={`${game._id}`}
              title={game.title}
              releaseYear={game.releaseYear}
              rating={game.aggregatedRating}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: `${game._id}` } })}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 100,
  },
  searchWrap: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
});
