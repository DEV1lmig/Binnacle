import { StyleProp, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import { Pressable, View, Text } from "@/src/tw";
import { Image } from "@/src/tw/image";
import { C, FONT_MONO, FONT_BODY } from "@binnacle/design-tokens";
import { toIdString } from "@/src/lib/id";
import { normalizeRatingToTen } from "@/src/lib/format";

type GameCardProps = {
  gameId: unknown;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  aggregatedRating?: number;
  status?: string;
  width?: number;
  style?: StyleProp<ViewStyle>;
};

export function GameCard({
  gameId,
  title,
  coverUrl,
  releaseYear,
  aggregatedRating,
  width = 140,
  style,
}: GameCardProps) {
  const router = useRouter();
  const id = toIdString(gameId);
  const rating = aggregatedRating ? normalizeRatingToTen(aggregatedRating) : null;

  return (
    <Pressable
      onPress={() => {
        if (id) {
          router.push({ pathname: "/game/[id]", params: { id } });
        }
      }}
      style={[
        {
          width,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 2,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View style={{ width: "100%", aspectRatio: 2 / 3, backgroundColor: C.bgAlt }}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : null}

        {rating !== null ? (
          <View
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              backgroundColor: `${C.bg}D9`,
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 2,
            }}
          >
            <Star size={10} color={C.amber} fill={C.amber} strokeWidth={0} />
            <Text
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: "400",
                color: C.text,
              }}
            >
              {rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 12, minHeight: 60, gap: 2 }}>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: "500",
            lineHeight: 18,
            color: C.text,
          }}
        >
          {title}
        </Text>
        {releaseYear ? (
          <Text
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              textTransform: "uppercase",
              color: C.textDim,
              letterSpacing: 1,
            }}
          >
            {releaseYear}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
