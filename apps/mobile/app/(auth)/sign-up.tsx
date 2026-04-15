import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { api } from "@binnacle/convex-generated/api";
import { useMutation } from "convex/react";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { colors, spacing } from "@/src/ui/theme";
import { isValidPassword, isValidUsername } from "@/src/lib/validators";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) {
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = emailAddress.trim();

    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert("Missing details", "Fill in all fields to create your account.");
      return;
    }

    if (!isValidUsername(normalizedUsername)) {
      Alert.alert(
        "Invalid username",
        "Use 3-32 lowercase letters, numbers, or underscores."
      );
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert("Weak password", "Use at least 8 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await signUp.create({
        username: normalizedUsername,
        emailAddress: normalizedEmail,
        password,
      });

      if (created.status === "complete") {
        await setActive({ session: created.createdSessionId });
        await syncCurrentUser({});
        router.replace("/(tabs)/feed");
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push({
        pathname: "/(auth)/complete",
        params: { emailAddress: normalizedEmail },
      });
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ?? error?.errors?.[0]?.message ?? "Sign up failed.";
      Alert.alert("Sign up failed", String(message));
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
          <Heading style={styles.title}>Create your account</Heading>
          <Body>Join Binnacle to build your backlog and discover players.</Body>
        </View>

        <View style={styles.form}>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="player_one"
          />
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="player@example.com"
          />
          <Input
            secureTextEntry
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
          />
          <Button label="Create Account" onPress={onSubmit} loading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <Body>Already a member?</Body>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
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
    fontSize: 30,
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
