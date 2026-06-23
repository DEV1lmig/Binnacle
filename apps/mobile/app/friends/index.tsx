import { Inbox, Send, Users } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, EmptyState, Heading, Screen, SectionTag } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { UserRow } from "@/src/ui/UserRow";
import { colors, spacing } from "@/src/ui/theme";

export default function FriendsPage() {
  const friends = useQuery(api.friends.listFriends, { limit: 50 });
  const incoming = useQuery(api.friends.listIncomingRequests, { limit: 50 });
  const outgoing = useQuery(api.friends.listOutgoingRequests, { limit: 50 });

  const respondToRequest = useMutation(api.friends.respondToRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  if (friends === undefined || incoming === undefined || outgoing === undefined) {
    return <LoadingState label="Loading friends..." />;
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Friends</Heading>

        <View style={styles.section}>
          <SectionTag label="Incoming Requests" color={colors.warning} />
          {incoming.length === 0 ? (
            <EmptyState icon={Inbox} title="No incoming requests" />
          ) : (
            incoming.map((request) => (
              <View key={`${request.requestId}`} style={styles.requestCard}>
                <UserRow name={request.requester.name} username={request.requester.username} />
                <View style={styles.inlineButtons}>
                  <Button
                    label="Accept"
                    onPress={() => {
                      void respondToRequest({ requestId: request.requestId, action: "accept" });
                    }}
                  />
                  <Button
                    label="Decline"
                    variant="secondary"
                    onPress={() => {
                      void respondToRequest({ requestId: request.requestId, action: "decline" });
                    }}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionTag label="Outgoing Requests" color={colors.accent} />
          {outgoing.length === 0 ? (
            <EmptyState icon={Send} title="No outgoing requests" />
          ) : (
            outgoing.map((request) => (
              <View key={`${request.requestId}`} style={styles.requestCard}>
                <UserRow name={request.recipient.name} username={request.recipient.username} />
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    void cancelRequest({ requestId: request.requestId });
                  }}
                />
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionTag label="Your Friends" color={colors.success} />
          {friends.length === 0 ? (
            <EmptyState icon={Users} title="No friends yet" description="Find people from Discover and send requests." />
          ) : (
            friends.map((friend) => (
              <View key={`${friend._id}`} style={styles.requestCard}>
                <UserRow name={friend.name} username={friend.username} />
                <Button
                  label="Remove"
                  variant="danger"
                  onPress={() => {
                    void removeFriend({ targetUserId: friend._id });
                  }}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: 80,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  inlineButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
