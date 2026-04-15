import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Body, Button, Heading, Screen } from "@/src/ui/primitives";
import { colors, spacing } from "@/src/ui/theme";

export default function AuthIndexPage() {
  const router = useRouter();

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Heading style={styles.title}>Binnacle</Heading>
        <Body style={styles.subtitle}>
          Track games, share reviews, and keep up with your friends from your phone.
        </Body>
      </View>

      <View style={styles.actions}>
        <Button label="Sign In" onPress={() => router.push("/(auth)/sign-in")} />
        <Button
          label="Create Account"
          variant="secondary"
          onPress={() => router.push("/(auth)/sign-up")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "space-between",
    paddingVertical: spacing.xl,
  },
  hero: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 44,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    maxWidth: 320,
  },
  actions: {
    gap: spacing.md,
  },
});
