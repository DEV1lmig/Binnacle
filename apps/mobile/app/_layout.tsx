import "@/src/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text } from "react-native";
import { AuthProviders } from "@/src/providers/AuthProviders";

// Disable system font scaling so native text renders at the defined px sizes
// and matches the web build (which does not scale with OS accessibility text
// settings). This prevents phones with larger text enabled from blowing the
// mobile UI past the web sizes.
// `defaultProps` was removed from RN's public types (React 19) but still
// works at runtime on the legacy RN Text class.
const RNText = Text as unknown as {
  defaultProps?: { allowFontScaling?: boolean };
};
RNText.defaultProps = { ...(RNText.defaultProps ?? {}), allowFontScaling: false };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProviders>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sso-callback" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="game/[id]" />
            <Stack.Screen name="review/new" />
            <Stack.Screen name="review/[id]" />
            <Stack.Screen
              name="share-story/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="user/[username]" />
            <Stack.Screen name="friends/index" />
            <Stack.Screen name="settings/index" />
          </Stack>
        </AuthProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
