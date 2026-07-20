import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import {
  AuthScreen,
  AuthTag,
  AuthButton,
  AuthInput,
  AuthDivider,
  authTheme,
} from "@/src/features/auth/AuthComponents";

type OAuthProvider = "google" | "discord";

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [identifier, setIdentifier] = useState("");
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
        router.replace("/(tabs)/feed");
        return;
      }

      // The provider email matches an existing account, but the provider did
      // not verify it — Clerk requires an email code before linking the
      // social account to the existing one.
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

      // No account existed for this provider, so Clerk transferred the flow
      // to a sign-up that still needs more details (e.g. a username). Route
      // to the completion screen instead of leaving the user stuck here.
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
        "Sign in incomplete",
        "We couldn't complete that social sign-in. Please try again."
      );
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ?? error?.errors?.[0]?.message ?? "Sign in failed.";
      Alert.alert("Sign in failed", String(message));
    } finally {
      setOauthProvider(null);
    }
  };

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
                Welcome back, <Text style={styles.titleHighlight}>archivist</Text>.
              </Text>
              <Text style={styles.subtitle}>
                Your collection is waiting. Sign in to continue tracking, reviewing, and discovering.
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
                keyboardType="email-address"
                label="Email or username"
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="you@example.com"
              />
              <AuthInput
                secureTextEntry
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                rightLabel={
                  <Pressable onPress={() => {}}>
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </Pressable>
                }
              />
              
              <View style={styles.submitWrap}>
                <AuthButton
                  label="Sign In"
                  onPress={onSubmit}
                  loading={isSubmitting}
                  disabled={oauthProvider !== null}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <Text style={styles.link}>Create one</Text>
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
  forgotText: {
    color: authTheme.accent,
    fontSize: 11,
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