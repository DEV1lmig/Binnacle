import { useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { isValidUsername } from "@/src/lib/validators";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { spacing } from "@/src/ui/theme";

type Mode = "verify" | "profile" | "sign-in-verify";

export default function CompleteSignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emailAddress?: string; mode?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  const initialMode: Mode =
    params.mode === "profile"
      ? "profile"
      : params.mode === "sign-in-verify"
        ? "sign-in-verify"
        : "verify";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Ref guard: state updates are async, so rapid double-taps could otherwise
  // fire two verification attempts and burn the one-time code.
  const submittingRef = useRef(false);

  const emailAddress = useMemo(() => {
    const value = params.emailAddress;
    if (typeof value === "string" && value) {
      return value;
    }
    return signUp?.emailAddress ?? "";
  }, [params.emailAddress, signUp?.emailAddress]);

  const missingFields = signUp?.missingFields ?? [];
  const needsUsername = missingFields.includes("username");
  const needsFirstName = missingFields.includes("first_name");
  const needsLastName = missingFields.includes("last_name");

  const finish = async (sessionId: string | null) => {
    if (!sessionId || !setActive) {
      Alert.alert("Almost there", "Your account was created but no session was returned. Please sign in.");
      router.replace("/(auth)/sign-in");
      return;
    }
    await setActive({ session: sessionId });
    await syncCurrentUser({});
    router.replace("/(tabs)/feed");
  };

  // Routes a sign-up result to the right next step: done, more profile
  // details, or (still) email verification.
  const handleSignUpStatus = async (status: string | null, createdSessionId: string | null) => {
    if (status === "complete") {
      await finish(createdSessionId);
      return;
    }

    if (status === "missing_requirements") {
      const missing = signUp?.missingFields ?? [];
      const needsProfile = missing.some((field) =>
        field === "username" || field === "first_name" || field === "last_name"
      );
      if (needsProfile) {
        // The email code was accepted, but the instance requires extra
        // profile details before the account can be completed.
        setMode("profile");
        return;
      }
      if (signUp?.unverifiedFields?.includes("email_address")) {
        setMode("verify");
        return;
      }
    }

    Alert.alert("Verification incomplete", "Your account is not fully verified yet.");
  };

  const onVerify = async () => {
    if (!isLoaded || !signUp || submittingRef.current) {
      return;
    }

    if (!code.trim()) {
      Alert.alert("Missing code", "Enter the verification code from your email.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      await handleSignUpStatus(result.status, result.createdSessionId);
    } catch (error: any) {
      // Codes are single-use: a previous attempt may have already consumed
      // this one and moved the sign-up forward. Check the resource status
      // before surfacing an error so users aren't told "code already used"
      // when they actually verified successfully.
      if (signUp.status === "complete") {
        await finish(signUp.createdSessionId);
        return;
      }
      if (signUp.status === "missing_requirements" && !signUp.unverifiedFields?.includes("email_address")) {
        setMode("profile");
        return;
      }
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Verification failed.";
      Alert.alert("Could not verify", String(message));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!isLoaded || !signUp || isResending) {
      return;
    }

    setIsResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCode("");
      Alert.alert("Code sent", `We sent a new code ${emailAddress ? `to ${emailAddress}` : "to your email"}.`);
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Could not resend the code.";
      Alert.alert("Resend failed", String(message));
    } finally {
      setIsResending(false);
    }
  };

  const onVerifySignIn = async () => {
    if (!isSignInLoaded || !signIn || submittingRef.current) {
      return;
    }

    if (!code.trim()) {
      Alert.alert("Missing code", "Enter the verification code from your email.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete") {
        await finish(result.createdSessionId);
        return;
      }

      Alert.alert("Verification incomplete", "Additional steps are required to finish signing in.");
    } catch (error: any) {
      // A previous attempt may have consumed the code and completed the sign-in.
      if (signIn.status === "complete") {
        await finish(signIn.createdSessionId);
        return;
      }
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Verification failed.";
      Alert.alert("Could not verify", String(message));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const onResendSignInCode = async () => {
    if (!isSignInLoaded || !signIn || isResending) {
      return;
    }

    const emailFactor = signIn.supportedFirstFactors?.find(
      (factor) => factor.strategy === "email_code"
    );
    if (!emailFactor || !("emailAddressId" in emailFactor)) {
      Alert.alert("Resend unavailable", "Go back and start the sign-in again.");
      return;
    }

    setIsResending(true);
    try {
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setCode("");
      Alert.alert("Code sent", "We sent a new code to your email.");
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Could not resend the code.";
      Alert.alert("Resend failed", String(message));
    } finally {
      setIsResending(false);
    }
  };

  const onCompleteProfile = async () => {
    if (!isLoaded || !signUp || submittingRef.current) {
      return;
    }

    const updates: { username?: string; firstName?: string; lastName?: string } = {};

    if (needsUsername) {
      const normalizedUsername = username.trim().toLowerCase();
      if (!isValidUsername(normalizedUsername)) {
        Alert.alert("Invalid username", "Use 3-32 lowercase letters, numbers, or underscores.");
        return;
      }
      updates.username = normalizedUsername;
    }
    if (needsFirstName) {
      if (!firstName.trim()) {
        Alert.alert("Missing details", "Enter your first name.");
        return;
      }
      updates.firstName = firstName.trim();
    }
    if (needsLastName) {
      if (!lastName.trim()) {
        Alert.alert("Missing details", "Enter your last name.");
        return;
      }
      updates.lastName = lastName.trim();
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await signUp.update(updates);
      await handleSignUpStatus(result.status, result.createdSessionId);
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Could not save your details.";
      Alert.alert("Something went wrong", String(message));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isLoaded && !signUp) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.header}>
          <Heading>Nothing to complete</Heading>
          <Body>There is no sign-up in progress. Start again to create your account.</Body>
        </View>
        <Button label="Back to sign up" onPress={() => router.replace("/(auth)/sign-up")} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        {mode === "sign-in-verify" ? (
          <>
            <View style={styles.header}>
              <Heading>Link your accounts</Heading>
              <Body>
                An account with {emailAddress || "this email"} already exists. Enter the code we
                sent to that email to link your social account to it.
              </Body>
            </View>

            <View style={styles.form}>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                label="Verification code"
                placeholder="123456"
                value={code}
                onChangeText={setCode}
              />
              <Button label="Confirm" onPress={onVerifySignIn} loading={isSubmitting} />
              <Button
                label="Resend code"
                variant="secondary"
                onPress={onResendSignInCode}
                loading={isResending}
                disabled={isSubmitting}
              />
            </View>
          </>
        ) : mode === "verify" ? (
          <>
            <View style={styles.header}>
              <Heading>Verify your email</Heading>
              <Body>
                We sent a code {emailAddress ? `to ${emailAddress}` : "to your email"}. Enter it below.
              </Body>
            </View>

            <View style={styles.form}>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                label="Verification code"
                placeholder="123456"
                value={code}
                onChangeText={setCode}
              />
              <Button label="Confirm" onPress={onVerify} loading={isSubmitting} />
              <Button
                label="Resend code"
                variant="secondary"
                onPress={onResend}
                loading={isResending}
                disabled={isSubmitting}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Heading>One last step</Heading>
              <Body>Your email is verified. Add these details to finish creating your account.</Body>
            </View>

            <View style={styles.form}>
              {needsUsername && (
                <Input
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="Username"
                  placeholder="player_one"
                  value={username}
                  onChangeText={setUsername}
                />
              )}
              {needsFirstName && (
                <Input
                  autoCapitalize="words"
                  label="First name"
                  placeholder="Ada"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              )}
              {needsLastName && (
                <Input
                  autoCapitalize="words"
                  label="Last name"
                  placeholder="Lovelace"
                  value={lastName}
                  onChangeText={setLastName}
                />
              )}
              <Button label="Finish" onPress={onCompleteProfile} loading={isSubmitting} />
            </View>
          </>
        )}
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
  form: {
    gap: spacing.md,
  },
});
