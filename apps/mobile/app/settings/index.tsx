import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ScrollView } from "@/src/tw";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, Heading, Input, Screen, SectionTag } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { UserRow } from "@/src/ui/UserRow";
import { colors, spacing } from "@/src/ui/theme";

type Visibility = "public" | "friends" | "private";
type FriendRequestPolicy = "everyone" | "friends_of_friends" | "nobody";

type NotificationPreferences = {
  email: { newFollower: boolean; friendRequest: boolean; likes: boolean; comments: boolean };
  push: { newFollower: boolean; friendRequest: boolean; likes: boolean; comments: boolean };
};

const VISIBILITIES: Visibility[] = ["public", "friends", "private"];
const FRIEND_REQUEST_POLICIES: FriendRequestPolicy[] = ["everyone", "friends_of_friends", "nobody"];

export default function SettingsPage() {
  const preferences = useQuery(api.settings.getPreferences);
  const privacy = useQuery(api.privacy.getSettings);
  const blocked = useQuery(api.blocking.listBlocked, { limit: 100 });
  const currentUser = useQuery(api.users.current);

  const updatePreferences = useMutation(api.settings.updatePreferences);
  const updatePrivacy = useMutation(api.privacy.updateSettings);
  const updateUsername = useMutation(api.settings.updateUsername);
  const updateNotifications = useMutation(api.notifications.updatePreferences);
  const checkUsernameAvailable = useQuery(
    api.settings.checkUsernameAvailable,
    { username: "placeholder" }
  );
  const unblock = useMutation(api.blocking.unblock);

  const [theme, setTheme] = useState<"dark" | "light" | "system">("system");
  const [cardView, setCardView] = useState<"compact" | "comfortable">("comfortable");
  const [profileVisibility, setProfileVisibility] = useState<Visibility>("public");
  const [backlogVisibility, setBacklogVisibility] = useState<Visibility>("public");
  const [reviewsVisibility, setReviewsVisibility] = useState<Visibility>("public");
  const [activityVisibility, setActivityVisibility] = useState<Visibility>("public");
  const [allowFriendRequests, setAllowFriendRequests] = useState<FriendRequestPolicy>("everyone");
  const [showStats, setShowStats] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [username, setUsername] = useState("");

  const defaultNotifications: NotificationPreferences = {
    email: { newFollower: true, friendRequest: true, likes: true, comments: true },
    push: { newFollower: true, friendRequest: true, likes: true, comments: true },
  };

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    ...defaultNotifications,
  });
  const [notifsHydrated, setNotifsHydrated] = useState(false);

  useEffect(() => {
    if (!preferences) {
      return;
    }
    setTheme((preferences.theme as "dark" | "light" | "system" | undefined) ?? "system");
    setCardView((preferences.cardView as "compact" | "comfortable" | undefined) ?? "comfortable");
  }, [preferences]);

  useEffect(() => {
    if (!privacy) {
      return;
    }
    setProfileVisibility(privacy.profileVisibility);
    setBacklogVisibility(privacy.backlogVisibility);
    setReviewsVisibility(privacy.reviewsVisibility);
    setActivityVisibility(privacy.activityVisibility);
    setAllowFriendRequests(privacy.allowFriendRequests);
    setShowStats(privacy.showStats);
    setShowOnlineStatus(privacy.showOnlineStatus);
  }, [privacy]);

  useEffect(() => {
    if (currentUser === undefined || notifsHydrated) {
      return;
    }
    if (currentUser?.notificationPreferences) {
      setNotificationPrefs(currentUser.notificationPreferences as NotificationPreferences);
    } else {
      setNotificationPrefs(defaultNotifications);
    }
    setNotifsHydrated(true);
  }, [currentUser, notifsHydrated]);

  const toggleNotif = (
    channel: "email" | "push",
    key: "newFollower" | "friendRequest" | "likes" | "comments"
  ) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [key]: !prev[channel][key] },
    }));
  };

  const usernameCheck = useQuery(
    api.settings.checkUsernameAvailable,
    username.trim() ? { username: username.trim().toLowerCase() } : "skip"
  );

  const usernameHelper = useMemo(() => {
    if (!username.trim()) {
      return "Enter a new username";
    }
    if (!usernameCheck) {
      return "Checking availability...";
    }
    return usernameCheck.available ? "Username is available" : usernameCheck.reason ?? "Unavailable";
  }, [username, usernameCheck]);

  if (preferences === undefined || privacy === undefined || blocked === undefined || currentUser === undefined) {
    return <LoadingState label="Loading settings..." />;
  }

  const savePreferences = async () => {
    try {
      await updatePreferences({ theme, cardView });
      Alert.alert("Saved", "Preferences updated.");
    } catch (error: any) {
      Alert.alert("Could not save preferences", error?.message ?? "Please try again.");
    }
  };

  const savePrivacy = async () => {
    try {
      await updatePrivacy({
        profileVisibility,
        backlogVisibility,
        reviewsVisibility,
        activityVisibility,
        allowFriendRequests,
        showStats,
        showOnlineStatus,
      });
      await updateNotifications({ preferences: notificationPrefs });
      Alert.alert("Saved", "Privacy and notification settings updated.");
    } catch (error: any) {
      Alert.alert("Could not save settings", error?.message ?? "Please try again.");
    }
  };

  const onUpdateUsername = async () => {
    const nextUsername = username.trim().toLowerCase();
    if (!nextUsername) {
      return;
    }
    try {
      await updateUsername({ username: nextUsername });
      setUsername("");
      Alert.alert("Saved", "Username updated.");
    } catch (error: any) {
      Alert.alert("Could not update username", error?.message ?? "Please try again.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Settings</Heading>

        <View style={styles.section}>
          <SectionTag label="Username" color={colors.accent} />
          <Input
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="new_username"
          />
          <Body style={styles.helper}>{usernameHelper}</Body>
          <Button label="Update Username" onPress={() => void onUpdateUsername()} />
        </View>

        <View style={styles.section}>
          <SectionTag label="Preferences" color={colors.warning} />
          <Body style={styles.fieldLabel}>Theme</Body>
          <View style={styles.inlineButtons}>
            {(["system", "light", "dark"] as const).map((option) => (
              <Button
                key={option}
                label={option}
                variant={theme === option ? "primary" : "secondary"}
                onPress={() => setTheme(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Card View</Body>
          <View style={styles.inlineButtons}>
            {(["comfortable", "compact"] as const).map((option) => (
              <Button
                key={option}
                label={option}
                variant={cardView === option ? "primary" : "secondary"}
                onPress={() => setCardView(option)}
              />
            ))}
          </View>
          <Button label="Save Preferences" onPress={() => void savePreferences()} />
        </View>

        <View style={styles.section}>
          <SectionTag label="Privacy" color={colors.success} />

          <Body style={styles.fieldLabel}>Profile Visibility</Body>
          <View style={styles.inlineButtons}>
            {VISIBILITIES.map((option) => (
              <Button
                key={`profile-${option}`}
                label={option}
                variant={profileVisibility === option ? "primary" : "secondary"}
                onPress={() => setProfileVisibility(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Backlog Visibility</Body>
          <View style={styles.inlineButtons}>
            {VISIBILITIES.map((option) => (
              <Button
                key={`backlog-${option}`}
                label={option}
                variant={backlogVisibility === option ? "primary" : "secondary"}
                onPress={() => setBacklogVisibility(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Reviews Visibility</Body>
          <View style={styles.inlineButtons}>
            {VISIBILITIES.map((option) => (
              <Button
                key={`reviews-${option}`}
                label={option}
                variant={reviewsVisibility === option ? "primary" : "secondary"}
                onPress={() => setReviewsVisibility(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Activity Visibility</Body>
          <View style={styles.inlineButtons}>
            {VISIBILITIES.map((option) => (
              <Button
                key={`activity-${option}`}
                label={option}
                variant={activityVisibility === option ? "primary" : "secondary"}
                onPress={() => setActivityVisibility(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Friend Requests</Body>
          <View style={styles.inlineButtons}>
            {FRIEND_REQUEST_POLICIES.map((option) => (
              <Button
                key={`requests-${option}`}
                label={option.replace(/_/g, " ")}
                variant={allowFriendRequests === option ? "primary" : "secondary"}
                onPress={() => setAllowFriendRequests(option)}
              />
            ))}
          </View>

          <Body style={styles.fieldLabel}>Show Stats</Body>
          <View style={styles.inlineButtons}>
            <Button label="On" variant={showStats ? "primary" : "secondary"} onPress={() => setShowStats(true)} />
            <Button label="Off" variant={!showStats ? "primary" : "secondary"} onPress={() => setShowStats(false)} />
          </View>

          <Body style={styles.fieldLabel}>Online Status</Body>
          <View style={styles.inlineButtons}>
            <Button
              label="On"
              variant={showOnlineStatus ? "primary" : "secondary"}
              onPress={() => setShowOnlineStatus(true)}
            />
            <Button
              label="Off"
              variant={!showOnlineStatus ? "primary" : "secondary"}
              onPress={() => setShowOnlineStatus(false)}
            />
          </View>

          <View style={styles.divider} />
          <SectionTag label="Notifications" color={colors.accentMuted} />

          <Body style={styles.fieldLabel}>Push Notifications</Body>
          <View style={styles.inlineButtons}>
            <Button label="New Followers" variant={notificationPrefs.push.newFollower ? "primary" : "secondary"} onPress={() => toggleNotif("push", "newFollower")} />
            <Button label="Friend Requests" variant={notificationPrefs.push.friendRequest ? "primary" : "secondary"} onPress={() => toggleNotif("push", "friendRequest")} />
            <Button label="Likes" variant={notificationPrefs.push.likes ? "primary" : "secondary"} onPress={() => toggleNotif("push", "likes")} />
            <Button label="Comments" variant={notificationPrefs.push.comments ? "primary" : "secondary"} onPress={() => toggleNotif("push", "comments")} />
          </View>

          <Body style={styles.fieldLabel}>Email Notifications</Body>
          <View style={styles.inlineButtons}>
            <Button label="New Followers" variant={notificationPrefs.email.newFollower ? "primary" : "secondary"} onPress={() => toggleNotif("email", "newFollower")} />
            <Button label="Friend Requests" variant={notificationPrefs.email.friendRequest ? "primary" : "secondary"} onPress={() => toggleNotif("email", "friendRequest")} />
            <Button label="Likes" variant={notificationPrefs.email.likes ? "primary" : "secondary"} onPress={() => toggleNotif("email", "likes")} />
            <Button label="Comments" variant={notificationPrefs.email.comments ? "primary" : "secondary"} onPress={() => toggleNotif("email", "comments")} />
          </View>

          <Button label="Save Privacy & Notifications" onPress={() => void savePrivacy()} />
        </View>

        <View style={styles.section}>
          <SectionTag label="Blocked Users" color={colors.danger} />
          {blocked.length === 0 ? (
            <Body>No blocked users.</Body>
          ) : (
            blocked.map((entry) => (
              <View key={`${entry.blocked._id}`} style={styles.blockedCard}>
                <UserRow name={entry.blocked.name} username={entry.blocked.username} />
                <Button
                  label="Unblock"
                  variant="secondary"
                  onPress={() => {
                    void unblock({ targetUserId: entry.blocked._id });
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
    paddingBottom: 100,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontWeight: "600",
    color: colors.textPrimary,
  },
  helper: {
    fontSize: 12,
  },
  inlineButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  blockedCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
});
