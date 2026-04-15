import { Pressable, StyleSheet, View } from "react-native";
import { Body } from "./primitives";
import { colors, spacing } from "./theme";

type UserRowProps = {
  name: string;
  username: string;
  trailing?: string;
  onPress?: () => void;
};

export function UserRow({ name, username, trailing, onPress }: UserRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.avatar}>
        <Body style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Body>
      </View>
      <View style={styles.textWrap}>
        <Body style={styles.name}>{name}</Body>
        <Body style={styles.username}>@{username}</Body>
      </View>
      {trailing ? <Body style={styles.trailing}>{trailing}</Body> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  username: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  trailing: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
