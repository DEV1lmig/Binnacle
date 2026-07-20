import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSSO, useSignUp } from "@clerk/clerk-expo";
import { api } from "@binnacle/convex-generated/api";
import { useMutation } from "convex/react";
import { isValidPassword, isValidUsername } from "@/src/lib/validators";
import {
  AuthScreen,
  AuthTag,
  AuthButton,
  AuthInput,
  AuthDivider,
  authTheme,
} from "@/src/features/auth/AuthComponents";

type OAuthProvider = "google" | "discord";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startSSOFlow } = useSSO();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);

  const onOAuthPress = async (provider: OAuthProvider) => {
    if (!isLoaded) {
      return;
    }

    const strategy = provider === "google" ? "oauth_google" : "oauth_discord";

    try {
      setOauthProvider(provider);

      const { createdSessionId, setActive: setActiveFromSSO, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
        strategy,
        redirectUrl: Linking.createURL("/sso-callback"),
      });

      if (createdSessionId && setActiveFromSSO) {
        await setActiveFromSSO({ session: createdSessionId });
        await syncCurrentUser({});
        router.replace("/(tabs)/feed");
        return;
      }

      // An account with this email already exists (the flow transferred to a
      // sign-in), but the provider did not verify the email — Clerk requires
      // an email code before linking the social account to the existing one.
      if (ssoSignIn?.status === "needs_first_factor") {
        const emailFactor = ssoSignIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code"
        );
        if (emailFactor && "emailAddressId" in emailFactor) {
          await ssoSignIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          router.push({
            pathname: "/(auth)/complete",
            params: { mode: "sign-in-verify", emailAddress: emailFactor.safeIdentifier ?? "" },
          });
          return;
        }
      }

      // The provider account was created but Clerk still needs more from the
      // user (e.g. a username, or email verification for unverified provider
      // emails). Send them to the completion screen instead of dropping them
      // back on the auth screens.
      if (ssoSignUp?.status === "missing_requirements") {
        const missing = ssoSignUp.missingFields ?? [];
        const needsProfile = missing.some(
          (field) => field === "username" || field === "first_name" || field === "last_name"
        );
        const ssoEmail = ssoSignUp.emailAddress ?? "";

        if (needsProfile) {
          router.push({
            pathname: "/(auth)/complete",
            params: { mode: "profile", emailAddress: ssoEmail },
          });
          return;
        }

        if (ssoSignUp.unverifiedFields?.includes("email_address")) {
          await ssoSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
          router.push({
            pathname: "/(auth)/complete",
            params: { emailAddress: ssoEmail },
          });
          return;
        }
      }

      Alert.alert(
        "Sign up incomplete",
        "We couldn't complete that social sign-up. Please try again."
      );
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ?? error?.errors?.[0]?.message ?? "Sign up failed.";
      Alert.alert("Sign up failed", String(message));
    } finally {
      setOauthProvider(null);
    }
  };

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
    <AuthScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <AuthTag label="Authentication Portal" />
              <Text style={styles.title}>
                Become an <Text style={styles.titleHighlight}>archivist</Text>.
              </Text>
              <Text style={styles.subtitle}>
                Join Binnacle to build your backlog and discover what others are playing.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.oauthSection}>
                <AuthButton
                  label="Continue with Google"
                  variant="secondary"
                  onPress={() => void onOAuthPress("google")}
                  loading={oauthProvider === "google"}
                  disabled={isSubmitting || (oauthProvider !== null && oauthProvider !== "google")}
                />
                <AuthButton
                  label="Continue with Discord"
                  variant="secondary"
                  onPress={() => void onOAuthPress("discord")}
                  loading={oauthProvider === "discord"}
                  disabled={isSubmitting || (oauthProvider !== null && oauthProvider !== "discord")}
                />
              </View>

              <AuthDivider />

              <AuthInput
                autoCapitalize="none"
                autoCorrect={false}
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="player_one"
              />
              <AuthInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                label="Email"
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="you@example.com"
              />
              <AuthInput
                secureTextEntry
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
              />
              
              <View style={styles.submitWrap}>
                <AuthButton
                  label="Create Account"
                  onPress={onSubmit}
                  loading={isSubmitting}
                  disabled={oauthProvider !== null}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already a member?</Text>
              <Pressable onPress={() => router.push("/(auth)/sign-in")}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    color: authTheme.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: authTheme.accent,
  },
  subtitle: {
    fontSize: 14,
    color: authTheme.textSecondary,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  oauthSection: {
    gap: 12,
  },
  submitWrap: {
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    color: authTheme.textSecondary,
    fontSize: 12,
  },
  link: {
    color: authTheme.accent,
    fontSize: 12,
    fontWeight: "500",
  },
});