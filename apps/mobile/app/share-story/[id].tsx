import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { Screen, Heading } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { ShareStoryBuilder } from "@/src/features/share/ShareStoryBuilder";

export default function ShareStoryPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = params.id as Id<"reviews"> | undefined;

  const review = useQuery(api.reviews.get, reviewId ? { reviewId } : "skip");

  if (!reviewId || review === undefined) {
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
    <ShareStoryBuilder
      reviewId={`${review._id}`}
      gameTitle={review.game.title}
      onClose={() => router.back()}
    />
  );
}
