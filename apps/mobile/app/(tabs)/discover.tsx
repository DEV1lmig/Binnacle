import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { Search, Loader2 } from "lucide-react-native";
import { api } from "@binnacle/convex-generated/api";
import { Screen } from "@/src/ui/primitives";
import { GameCard } from "@/src/ui/GameCard";
import { LoadingState } from "@/src/ui/LoadingState";
import { HudBadge, HudDivider, SectionHeader } from "@/src/ui/hud";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { toIdString } from "@/src/lib/id";
import { View, Text, ScrollView, Pressable, TextInput } from "@/src/tw";

type SearchResult = {
  _id?: unknown;
  convexId?: unknown;
  title?: string;
  releaseYear?: number;
  aggregatedRating?: number;
  coverUrl?: string;
};

const GENRES = ["RPG", "Action", "Adventure", "Strategy", "Racing", "Shooter", "Fighting", "Puzzle", "Platformer", "Simulation", "Indie", "Horror"];

export default function DiscoverTab() {
  const router = useRouter();
  const searchAction = useAction(api.igdb.searchOptimizedWithFallback);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
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
      <ScrollView contentContainerClassName="px-4 py-4 gap-6 pb-24">
        {/* Header */}
        <View style={{ gap: 12 }}>
          <HudBadge color={C.cyan}>Discover</HudBadge>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: "200", color: C.text, letterSpacing: -0.5 }}>
              Explore Games
            </Text>
            <Text style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
              Search the database or browse curated collections
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.bg,
            borderRadius: 2,
            paddingHorizontal: 12,
            height: 48,
            gap: 10,
          }}
        >
          <Search size={18} color={C.textDim} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search games..."
            placeholderTextColor={C.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void onSearch()}
            style={{
              flex: 1,
              fontFamily: FONT_BODY,
              fontSize: 15,
              color: C.text,
            }}
          />
          {isSearching ? (
            <Loader2 size={18} color={C.gold} strokeWidth={2} />
          ) : query.trim() ? (
            <Pressable onPress={() => void onSearch()} hitSlop={8}>
              <Text style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold, fontWeight: "600" }}>
                Search
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Search results */}
        {hasSearched ? (
          <View>
            <SectionHeader
              title={results.length > 0 ? "Search Results" : "No Results"}
              badge={results.length > 0 ? `${results.length}` : undefined}
              badgeColor={C.gold}
            />
            {results.length > 0 ? (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {results.map((game, index) => {
                  const gameId = toIdString(game.convexId) ?? toIdString(game._id);
                  return (
                    <GameCard
                      key={`${gameId ?? game.title ?? "result"}-${index}`}
                      gameId={gameId}
                      title={game.title ?? "Untitled Game"}
                      releaseYear={game.releaseYear}
                      aggregatedRating={game.aggregatedRating}
                      coverUrl={game.coverUrl}
                      width={140}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textDim, paddingVertical: 16, textAlign: "center" }}>
                Try a different search term.
              </Text>
            )}
          </View>
        ) : null}

        {/* Discover People */}
        {!hasSearched && discoverPeople && discoverPeople.length > 0 ? (
          <View>
            <SectionHeader title="Discover People" badge="Network" badgeColor={C.green} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {discoverPeople.map((user) => (
                <Pressable
                  key={`${user._id}`}
                  onPress={() => router.push({ pathname: "/user/[username]", params: { username: user.username } })}
                  className="active:opacity-70"
                  style={{
                    width: 160,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 2,
                    padding: 12,
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: C.bgAlt,
                      borderWidth: 1,
                      borderColor: C.borderLight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: FONT_HEADING, fontSize: 18, color: C.gold, fontWeight: "300" }}>
                      {(user.name ?? "?")[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: "500", color: C.text }}>
                    {user.name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
                    @{user.username}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!hasSearched ? <HudDivider /> : null}

        {/* Trending Now */}
        {!hasSearched && trending.length > 0 ? (
          <View>
            <SectionHeader title="Trending Now" badge="Trending" badgeColor={C.cyan} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {trending.map((game) => (
                <GameCard
                  key={`${game._id}`}
                  gameId={game._id}
                  title={game.title}
                  coverUrl={game.coverUrl}
                  releaseYear={game.releaseYear}
                  aggregatedRating={game.aggregatedRating}
                  width={140}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Highest Rated */}
        {!hasSearched && topRated.length > 0 ? (
          <View>
            <SectionHeader title="Highest Rated" badge="Top Rated" badgeColor={C.amber} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {topRated.map((game) => (
                <GameCard
                  key={`${game._id}`}
                  gameId={game._id}
                  title={game.title}
                  coverUrl={game.coverUrl}
                  releaseYear={game.releaseYear}
                  aggregatedRating={game.aggregatedRating}
                  width={140}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* New Releases */}
        {!hasSearched && newReleases.length > 0 ? (
          <View>
            <SectionHeader title="New Releases" badge="New" badgeColor={C.green} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {newReleases.map((game) => (
                <GameCard
                  key={`${game._id}`}
                  gameId={game._id}
                  title={game.title}
                  coverUrl={game.coverUrl}
                  releaseYear={game.releaseYear}
                  aggregatedRating={game.aggregatedRating}
                  width={140}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Browse by Genre */}
        {!hasSearched ? (
          <View>
            <HudDivider />
            <SectionHeader title="Browse by Genre" badge="Genres" badgeColor={C.gold} />
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {GENRES.map((genre) => (
                <Pressable
                  key={genre}
                  onPress={() => {
                    setQuery(genre);
                    setHasSearched(true);
                    void searchAction({ query: genre, limit: 20, minCachedResults: 8 }).then((response) => {
                      const list = Array.isArray(response?.results) ? (response.results as SearchResult[]) : [];
                      setResults(list);
                      setIsSearching(false);
                    });
                    setIsSearching(true);
                  }}
                  className="active:opacity-70"
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.surface,
                    borderRadius: 2,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontFamily: FONT_MONO, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted, fontWeight: "400" }}>
                    # {genre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
