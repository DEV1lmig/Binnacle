import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, EmptyState, Heading, Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = typeof params.username === "string" ? params.username : "";

  const dashboard = useQuery(
    api.users.dashboard,
    username ? { username, recentLimit: 20 } : "skip"
  );

  const follow = useMutation(api.followers.follow);
  const unfollow = useMutation(api.followers.unfollow);
  const sendRequest = useMutation(api.friends.sendRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const respondToRequest = useMutation(api.friends.respondToRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const block = useMutation(api.blocking.block);
  const unblock = useMutation(api.blocking.unblock);

  const relationship = useQuery(
    api.friends.relationship,
    dashboard ? { targetUserId: dashboard.user._id } : "skip"
  );
  const isBlocked = useQuery(
    api.blocking.isBlocked,
    dashboard ? { targetUserId: dashboard.user._id } : "skip"
  );

  if (!username || dashboard === undefined || relationship === undefined || isBlocked === undefined) {
    return <LoadingState label="Loading profile..." />;
  }

  if (!dashboard) {
    return (
      <Screen>
        <EmptyState title="Profile unavailable" description="This account may be private or does not exist." />
      </Screen>
    );
  }

  const onFollowToggle = () => {
    if (dashboard.viewerFollows) {
      void unfollow({ targetUserId: dashboard.user._id });
      return;
    }
    void follow({ targetUserId: dashboard.user._id });
  };

  const onFriendAction = () => {
    if (relationship.status === "friends") {
      void removeFriend({ targetUserId: dashboard.user._id });
      return;
    }

    if (relationship.status === "incoming" && relationship.requestId) {
      void respondToRequest({ requestId: relationship.requestId, action: "accept" });
      return;
    }

    if (relationship.status === "outgoing" && relationship.requestId) {
      void cancelRequest({ requestId: relationship.requestId });
      return;
    }

    if (relationship.status === "none") {
      void sendRequest({ recipientId: dashboard.user._id });
    }
  };

  const friendActionLabel =
    relationship.status === "friends"
      ? "Remove Friend"
      : relationship.status === "incoming"
        ? "Accept Request"
        : relationship.status === "outgoing"
          ? "Cancel Request"
          : "Add Friend";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{dashboard.user.name}</Heading>
        <Body>@{dashboard.user.username}</Body>
        {dashboard.user.bio ? <Body>{dashboard.user.bio}</Body> : null}

        <View style={styles.statsRow}>
          <Body>{dashboard.followerCount} followers</Body>
          <Body>{dashboard.followingCount} following</Body>
          <Body>{dashboard.reviewStats.reviewCount} reviews</Body>
        </View>

        {!dashboard.viewerIsSelf ? (
          <View style={styles.actionsRow}>
            <Button
              label={dashboard.viewerFollows ? "Unfollow" : "Follow"}
              variant={dashboard.viewerFollows ? "secondary" : "primary"}
              onPress={onFollowToggle}
            />
            <Button label={friendActionLabel} variant="secondary" onPress={onFriendAction} />
            <Button
              label={isBlocked ? "Unblock" : "Block"}
              variant="danger"
              onPress={() => {
                if (isBlocked) {
                  void unblock({ targetUserId: dashboard.user._id });
                  return;
                }

                void block({ targetUserId: dashboard.user._id });
              }}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Body style={styles.sectionTitle}>Recent Reviews</Body>
          {dashboard.recentReviews.length === 0 ? (
            <EmptyState title="No recent reviews" description="This user has not posted any reviews yet." />
          ) : (
            dashboard.recentReviews.map((review) => {
              const reviewId = toIdString(review._id);

              return (
                <ReviewCard
                  key={`${review._id}`}
                  title={review.game.title}
                  rating={review.rating}
                  authorName={dashboard.user.name}
                  authorUsername={dashboard.user.username}
                  excerpt={review.text}
                  createdAt={review._creationTime}
                  onPress={() => {
                    if (reviewId) {
                      router.push({ pathname: "/review/[id]", params: { id: reviewId } });
                    }
                  }}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionsRow: {
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
