import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { colors, spacing } from "@/src/ui/theme";

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) {
      return;
    }

    if (!identifier.trim() || !password) {
      Alert.alert("Missing details", "Enter your email/username and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await signIn.create({
        identifier: identifier.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/feed");
      } else {
        Alert.alert("Verification needed", "Complete the remaining sign-in step in Clerk.");
      }
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ?? error?.errors?.[0]?.message ?? "Sign in failed.";
      Alert.alert("Sign in failed", String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Heading style={styles.title}>Welcome back</Heading>
          <Body>Sign in to continue tracking your backlog and reviews.</Body>
        </View>

        <View style={styles.form}>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email or username"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="player@example.com"
          />
          <Input
            secureTextEntry
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="********"
          />
          <Button label="Sign In" onPress={onSubmit} loading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <Body>Need an account?</Body>
          <Link href="/(auth)/sign-up" style={styles.link}>
            Create one
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  keyboardView: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 32,
  },
  form: {
    gap: spacing.md,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});
