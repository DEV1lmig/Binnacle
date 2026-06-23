import { ReactNode } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { View, Text, Pressable } from "@/src/tw";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";

type HudBadgeProps = {
  children: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function HudBadge({ children, color = C.cyan, style }: HudBadgeProps) {
  return (
    <View
      className="flex-row items-center self-start px-3 py-1"
      style={[
        {
          borderWidth: 1,
          borderColor: `${color}33`,
          borderRadius: 2,
          gap: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 9999,
          backgroundColor: color,
          opacity: 0.7,
        }}
      />
      <Text
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: "400",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

type HudDividerProps = {
  style?: StyleProp<ViewStyle>;
};

export function HudDivider({ style }: HudDividerProps) {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: C.border,
        },
        style,
      ]}
    />
  );
}

type CornerMarkersProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function CornerMarkers({ size = 12, color = C.borderLight, style }: CornerMarkersProps) {
  const border = `${color}`;
  const base: ViewStyle = {
    position: "absolute",
    width: size,
    height: size,
  };
  return (
    <View pointerEvents="none" style={[{ position: "absolute", inset: 0 }, style]}>
      <View style={{ ...base, top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1, borderColor: border }} />
      <View style={{ ...base, top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1, borderColor: border }} />
      <View style={{ ...base, bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: border }} />
      <View style={{ ...base, bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1, borderColor: border }} />
    </View>
  );
}

type StatPillProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function StatPill({ label, value, icon: Icon, color = C.gold, style }: StatPillProps) {
  return (
    <View
      className="flex-row items-center p-3"
      style={[
        {
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 2,
          gap: 12,
          flex: 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 2,
          backgroundColor: `${color}15`,
          borderWidth: 1,
          borderColor: `${color}30`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 18,
            fontWeight: "300",
            color: C.text,
            lineHeight: 22,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: C.textDim,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  badge?: string;
  badgeColor?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({
  title,
  badge,
  badgeColor = C.cyan,
  action,
  onAction,
  style,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between" style={[{ marginBottom: 12 }, style]}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {badge ? <HudBadge color={badgeColor}>{badge}</HudBadge> : null}
        <Text
          style={{
            fontFamily: FONT_HEADING,
            fontWeight: "200",
            fontSize: 22,
            color: C.text,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
      </View>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          className="flex-row items-center active:opacity-70"
          style={{
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 2,
            paddingHorizontal: 12,
            paddingVertical: 6,
            gap: 4,
          }}
        >
          <Text
            style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: C.gold,
            }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
  icon?: LucideIcon;
};

export function TabButton({ label, active, onPress, count, icon: Icon }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        borderBottomWidth: active ? 2 : 0,
        borderBottomColor: C.gold,
      }}
    >
      {Icon ? <Icon size={14} color={active ? C.text : C.textMuted} strokeWidth={2} /> : null}
      <Text
        style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          fontWeight: active ? "600" : "400",
          color: active ? C.text : C.textMuted,
        }}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <View
          style={{
            backgroundColor: active ? `${C.gold}20` : `${C.textDim}20`,
            borderRadius: 9999,
            paddingHorizontal: 6,
            paddingVertical: 1,
            minWidth: 18,
            alignItems: "center",
          }}
        >
          <Text
            style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            fontWeight: "600",
            color: active ? C.gold : C.textMuted,
            }}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
