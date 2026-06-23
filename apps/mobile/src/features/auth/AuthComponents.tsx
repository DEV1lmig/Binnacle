import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReactNode } from "react";
import { colors } from "@binnacle/design-tokens";

export const authTheme = {
  bg: colors.bg,
  surface: colors.surface,
  border: colors.border,
  textPrimary: colors.text,
  textSecondary: colors.textMuted,
  accent: colors.gold,
};

export function AuthScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {children}
    </View>
  );
}

export function AuthTag({ label }: { label: string }) {
  return (
    <View style={styles.tagContainer}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function AuthButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonBase,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#000" : authTheme.textPrimary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type AuthInputProps = TextInputProps & {
  label: string;
  rightLabel?: ReactNode;
};

export function AuthInput({ label, rightLabel, ...props }: AuthInputProps) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputHeader}>
        <Text style={styles.inputLabel}>{label}</Text>
        {rightLabel}
      </View>
      <TextInput
        placeholderTextColor={authTheme.textSecondary}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>OR</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
  tagContainer: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${colors.gold}4D`, // 30% opacity
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  tagText: {
    color: authTheme.accent,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  buttonBase: {
    minHeight: 48,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: authTheme.accent,
  },
  buttonSecondary: {
    backgroundColor: authTheme.surface,
    borderWidth: 1,
    borderColor: authTheme.border,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: colors.bg, // Dark background color for contrast on bright blue
    textTransform: "uppercase",
  },
  buttonTextSecondary: {
    color: authTheme.textPrimary,
  },
  inputWrap: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  inputLabel: {
    color: authTheme.textSecondary,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  input: {
    backgroundColor: authTheme.surface,
    borderWidth: 1,
    borderColor: authTheme.border,
    borderRadius: 4,
    color: authTheme.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: authTheme.border,
  },
  dividerText: {
    color: authTheme.textSecondary,
    fontSize: 11,
    letterSpacing: 2,
  },
});
