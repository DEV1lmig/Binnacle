import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useClerk } from "@clerk/clerk-expo";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { spacing } from "@/src/ui/theme";
import { formatNumber } from "@/src/lib/format";

export default function ProfileTab() {
  const router = useRouter();
  const { signOut } = useClerk();
  const dashboard = useQuery(api.users.dashboard, {});
  const updateProfile = useMutation(api.users.updateProfile);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  if (dashboard === undefined) {
    return <LoadingState label="Loading profile..." />;
  }

  if (!dashboard) {
    return <LoadingState label="Preparing profile..." />;
  }

  const onSave = async () => {
    try {
      await updateProfile({
        name: name.trim() ? name.trim() : dashboard.user.name,
        bio: bio.trim() ? bio.trim() : "",
      });
      setEditing(false);
    } catch (error: any) {
      Alert.alert("Could not update profile", error?.message ?? "Please try again.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>Profile</Heading>

        <View style={styles.header}>
          <Body style={styles.name}>{dashboard.user.name}</Body>
          <Body>@{dashboard.user.username}</Body>
          {dashboard.user.bio ? <Body>{dashboard.user.bio}</Body> : null}
        </View>

        <View style={styles.stats}>
          <Body>{formatNumber(dashboard.followerCount)} followers</Body>
          <Body>{formatNumber(dashboard.followingCount)} following</Body>
          <Body>{formatNumber(dashboard.reviewStats.reviewCount)} reviews</Body>
          <Body>{formatNumber(dashboard.backlogStats.total)} backlog</Body>
        </View>

        {editing ? (
          <View style={styles.form}>
            <Input label="Display name" value={name} onChangeText={setName} placeholder={dashboard.user.name} />
            <Input label="Bio" value={bio} onChangeText={setBio} placeholder={dashboard.user.bio ?? "Tell people what you play"} />
            <Button label="Save" onPress={() => void onSave()} />
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          </View>
        ) : (
          <Button
            label="Edit profile"
            variant="secondary"
            onPress={() => {
              setName(dashboard.user.name);
              setBio(dashboard.user.bio ?? "");
              setEditing(true);
            }}
          />
        )}

        <View style={styles.actions}>
          <Button label="Friends" variant="secondary" onPress={() => router.push("/friends")} />
          <Button label="Settings" variant="secondary" onPress={() => router.push("/settings")} />
          <Button
            label="Sign Out"
            variant="danger"
            onPress={() => {
              void signOut({ redirectUrl: "/(auth)" });
            }}
          />
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
  header: {
    gap: spacing.xs,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
  },
  stats: {
    gap: 6,
  },
  form: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
