import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProviders } from "@/src/providers/AuthProviders";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProviders>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="game/[id]" />
            <Stack.Screen name="review/[id]" />
            <Stack.Screen name="user/[username]" />
            <Stack.Screen name="friends/index" />
            <Stack.Screen name="settings/index" />
          </Stack>
        </AuthProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
