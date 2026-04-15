import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body, Button, Heading, Input, Screen } from "@/src/ui/primitives";
import { spacing } from "@/src/ui/theme";

export default function CompleteSignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emailAddress?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailAddress = useMemo(() => {
    const value = params.emailAddress;
    return typeof value === "string" ? value : "";
  }, [params.emailAddress]);

  const onSubmit = async () => {
    if (!isLoaded) {
      return;
    }

    if (!code.trim()) {
      Alert.alert("Missing code", "Enter the verification code from your email.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status !== "complete") {
        Alert.alert("Verification incomplete", "Your account is not fully verified yet.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      await syncCurrentUser({});
      router.replace("/(tabs)/feed");
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ??
        error?.errors?.[0]?.message ??
        "Verification failed.";
      Alert.alert("Could not verify", String(message));
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
          <Button label="Confirm" onPress={onSubmit} loading={isSubmitting} />
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
  form: {
    gap: spacing.md,
  },
});
