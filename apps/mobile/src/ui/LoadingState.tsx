import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Body } from "./primitives";
import { colors } from "./theme";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="small" />
      <Body>{label}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
    backgroundColor: colors.bg,
  },
});
