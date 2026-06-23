import { useRouter } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { AuthOrbitalCarousel } from "@/src/features/auth/AuthOrbitalCarousel";
import { AuthScreen, AuthButton, AuthTag, authTheme } from "@/src/features/auth/AuthComponents";

export default function AuthIndexPage() {
  const router = useRouter();

  return (
    <AuthScreen>
      <View style={styles.content}>
        <View style={styles.hero}>
          <AuthTag label="Welcome" />
          <Text style={styles.title}>Binnacle</Text>
          <Text style={styles.subtitle}>
            Track games, share reviews, and keep up with your friends from your phone.
          </Text>
        </View>

        <AuthOrbitalCarousel style={styles.carousel} />

        <View style={styles.actions}>
          <AuthButton label="Sign In" onPress={() => router.push("/(auth)/sign-in")} />
          <AuthButton
            label="Create Account"
            variant="secondary"
            onPress={() => router.push("/(auth)/sign-up")}
          />
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  hero: {
    marginTop: 24,
    gap: 8,
  },
  title: {
    fontSize: 44,
    letterSpacing: -1,
    fontWeight: "300",
    color: authTheme.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: authTheme.textSecondary,
    lineHeight: 24,
    maxWidth: 320,
    marginTop: 8,
  },
  carousel: {
    flex: 1,
    marginVertical: 32,
  },
  actions: {
    gap: 16,
    marginBottom: 16,
  },
});