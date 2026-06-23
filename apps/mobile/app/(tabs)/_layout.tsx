import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, TabIcons } from "@/src/ui/icons";
import { colors } from "@/src/ui/theme";
import { LoadingState } from "@/src/ui/LoadingState";

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) {
    return <LoadingState label="Loading app..." />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          minHeight: 64 + insets.bottom, // Dynamic height that accounts for the notch/home indicator
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false, // Cleaner look without labels for a notched/modern UI
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ focused }) => <TabIcon icon={TabIcons.feed} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ focused }) => <TabIcon icon={TabIcons.discover} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="backlog"
        options={{
          title: "Backlog",
          tabBarIcon: ({ focused }) => <TabIcon icon={TabIcons.backlog} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <TabIcon icon={TabIcons.notifications} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon={TabIcons.profile} active={focused} />,
        }}
      />
    </Tabs>
  );
}
