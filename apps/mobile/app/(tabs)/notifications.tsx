import { ScrollView, StyleSheet, View } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, EmptyState, Heading, Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";
import { formatDate } from "@/src/lib/format";

function NotificationRow({ notification }: { notification: any }) {
  const actor = useQuery(api.users.getPublicProfile, { userId: notification.actorId });

  const actorLabel = actor ? `${actor.name} (@${actor.username})` : "Someone";

  const typeLabelMap: Record<string, string> = {
    follow: "followed you",
    friend_request: "sent you a friend request",
    friend_accepted: "accepted your friend request",
    like: "liked your review",
    comment: "commented on your review",
    mention: "mentioned you",
  };

  return (
    <View style={styles.notificationRow}>
      <Body style={styles.notificationTitle}>
        {actorLabel} {typeLabelMap[notification.type] ?? notification.type}
      </Body>
      <Body style={styles.notificationMeta}>{formatDate(notification.createdAt)}</Body>
      {!notification.read ? <Body style={styles.unread}>Unread</Body> : null}
    </View>
  );
}

export default function NotificationsTab() {
  const notifications = useQuery(api.notifications.list, { limit: 40 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  if (notifications === undefined || unreadCount === undefined) {
    return <LoadingState label="Loading notifications..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Notifications</Heading>
        <View style={styles.controls}>
          <Body>{unreadCount.count} unread</Body>
          <Button
            label="Mark all read"
            variant="secondary"
            onPress={() => {
              void markAllAsRead({});
            }}
          />
        </View>

        {notifications.length === 0 ? (
          <EmptyState title="All quiet" description="New likes, comments, and follows will appear here." />
        ) : (
          notifications.map((notification) => (
            <NotificationRow key={`${notification._id}`} notification={notification} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: 100,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationRow: {
    gap: 4,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2d3b66",
    backgroundColor: "#131a30",
  },
  notificationTitle: {
    color: "#f3f5ff",
    fontWeight: "600",
  },
  notificationMeta: {
    fontSize: 12,
  },
  unread: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4cc9f0",
  },
});
