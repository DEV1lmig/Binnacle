import { UserX, Ghost } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ScrollView } from "@/src/tw";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, EmptyState, Heading, Input, Screen, SectionTag } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { ReviewCard } from "@/src/ui/ReviewCard";
import { colors, spacing } from "@/src/ui/theme";
import { toIdString } from "@/src/lib/id";

const REPORT_REASONS = ["spam", "harassment", "inappropriate", "other"] as const;

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
  const createReport = useMutation(api.reports.create);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]>("spam");
  const [reportDescription, setReportDescription] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);

  const relationship = useQuery(
    api.friends.relationship,
    dashboard ? { targetUserId: dashboard.user._id } : "skip"
  );
  const isBlocked = useQuery(
    api.blocking.isBlocked,
    dashboard ? { targetUserId: dashboard.user._id } : "skip"
  );
  const isBlockedBy = useQuery(
    api.blocking.isBlockedBy,
    dashboard ? { targetUserId: dashboard.user._id } : "skip"
  );

  if (!username || dashboard === undefined || relationship === undefined || isBlocked === undefined || isBlockedBy === undefined) {
    return <LoadingState label="Loading profile..." />;
  }

  if (!dashboard) {
    return (
      <Screen>
        <EmptyState icon={UserX} title="Profile unavailable" description="This account may be private, blocked, or does not exist." />
      </Screen>
    );
  }

  const onReportUser = async () => {
    try {
      await createReport({
        targetType: "user",
        targetId: toIdString(dashboard.user._id) ?? "",
        reason: reportReason,
        description: reportDescription.trim() ? reportDescription.trim() : undefined,
      });
      setShowReportForm(false);
      setReportDescription("");
      Alert.alert("Report submitted", "Thanks for helping keep the community safe.");
    } catch (error: any) {
      Alert.alert("Could not submit report", error?.message ?? "Please try again.");
    }
  };

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

        {isBlockedBy ? (
          <EmptyState
            title="You are blocked"
            description="This user has blocked you, so profile interactions are limited."
          />
        ) : null}

        {!dashboard.viewerIsSelf && !isBlockedBy ? (
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
            <Button
              label={showReportForm ? "Hide Report" : "Report User"}
              variant="secondary"
              onPress={() => setShowReportForm((prev) => !prev)}
            />
          </View>
        ) : null}

        {!dashboard.viewerIsSelf && !isBlockedBy && showReportForm ? (
          <View style={styles.reportBox}>
            <SectionTag label="Report User" color={colors.danger} />
            <View style={styles.reportReasons}>
              {REPORT_REASONS.map((reason) => (
                <Button
                  key={reason}
                  label={reason}
                  variant={reportReason === reason ? "primary" : "secondary"}
                  onPress={() => setReportReason(reason)}
                />
              ))}
            </View>
            <Input
              label="Details (optional)"
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Add context for moderators"
              multiline
            />
            <Button label="Submit Report" variant="danger" onPress={() => void onReportUser()} />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTag label="Recent Reviews" color={colors.accent} />
          {dashboard.recentReviews.length === 0 ? (
            <EmptyState icon={Ghost} title="No recent reviews" description="This user has not posted any reviews yet." />
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
                  coverUrl={review.game.coverUrl}
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
  reportBox: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reportReasons: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
