import { ReactNode } from "react";
import { ActivityIndicator, StyleProp, TextStyle, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LucideIcon } from "lucide-react-native";
import { View, Text, Pressable, TextInput, ScrollView } from "@/src/tw";
import { colors, spacing } from "./theme";

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom" | "left" | "right")[];
};

export function Screen({ children, style, edges = ["top", "left", "right"] }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const safeStyle: ViewStyle = {
    paddingTop: edges.includes("top") ? insets.top + spacing.md : spacing.md,
    paddingBottom: edges.includes("bottom") ? insets.bottom + spacing.md : spacing.md,
    paddingLeft: edges.includes("left") ? insets.left + spacing.md : spacing.md,
    paddingRight: edges.includes("right") ? insets.right + spacing.md : spacing.md,
  };

  return (
    <View className="flex-1 bg-bg" style={[safeStyle, style]}>
      {children}
    </View>
  );
}

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: CardProps) {
  return (
    <View
      className="bg-surface rounded-sm border border-border p-4 gap-2 overflow-hidden"
      style={style}
    >
      {children}
    </View>
  );
}

type SectionTagProps = {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function SectionTag({ label, color = colors.accent, style }: SectionTagProps) {
  return (
    <View
      className="flex-row items-center self-start bg-transparent border border-borderLight rounded-sm px-2 py-1 gap-1.5 mb-2"
      style={style}
    >
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold tracking-widest uppercase text-textMuted">
        {label}
      </Text>
    </View>
  );
}

type HeadingProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  className?: string;
};

export function Heading({ children, style }: HeadingProps) {
  return (
    <Text className="text-text text-5xl font-light tracking-tight" style={style}>
      {children}
    </Text>
  );
}

type BodyProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  className?: string;
};

export function Body({ children, style, numberOfLines }: BodyProps) {
  return (
    <Text
      className="text-textMuted text-base leading-snug"
      style={style}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: ButtonProps) {
  const baseClasses =
    "min-h-12 rounded-sm items-center justify-center px-4 flex-row gap-2";
  const variantClasses =
    variant === "primary"
      ? "bg-gold"
      : variant === "danger"
        ? "bg-red"
        : "bg-surface border border-border";
  const stateClasses = disabled || loading ? "opacity-50" : "active:opacity-80 active:scale-[0.98]";

  const textColor = variant === "primary" ? "text-bg" : "text-text";

  // bg-red via NativeWind may not resolve on native — provide explicit fallback
  const variantStyle =
    variant === "danger" ? { backgroundColor: colors.danger } : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses} ${stateClasses}`}
      style={[variantStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.bg : colors.textPrimary} />
      ) : (
        <Text className={`text-sm font-semibold tracking-wider uppercase ${textColor}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type InputProps = React.ComponentProps<typeof TextInput> & {
  label?: string;
};

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View className="gap-1">
      {label ? (
        <Text className="text-text text-sm font-semibold tracking-wide uppercase">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        className="rounded-sm border border-border bg-bg text-text px-4 py-3 text-base"
        style={[{ color: colors.textPrimary, backgroundColor: colors.bg }, style]}
        {...props}
      />
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <View className="items-center justify-center min-h-[180px] gap-2 p-6 rounded-md border border-dashed border-border">
      {Icon && (
        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-1 border border-border">
          <Icon size={32} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
      )}
      <Heading className="text-lg text-center">{title}</Heading>
      {description ? (
        <Body className="text-center max-w-[260px]">{description}</Body>
      ) : null}
    </View>
  );
}

export { ScrollView };
