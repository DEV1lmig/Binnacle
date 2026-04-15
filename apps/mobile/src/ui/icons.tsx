import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

type IconProps = {
  symbol: string;
  active?: boolean;
};

export function TabIcon({ symbol, active }: IconProps) {
  return (
    <View style={[styles.wrap, active && styles.wrapActive]}>
      <Text style={[styles.label, active && styles.labelActive]}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  wrapActive: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.accent,
  },
});
