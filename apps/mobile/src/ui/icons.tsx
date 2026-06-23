import { StyleSheet, View } from "react-native";
import { 
  Home, 
  Compass, 
  Library, 
  Bell, 
  User,
  LucideIcon 
} from "lucide-react-native";
import { colors } from "./theme";

type IconProps = {
  icon: LucideIcon;
  active?: boolean;
};

export function TabIcon({ icon: Icon, active }: IconProps) {
  return (
    <View style={[styles.wrap, active && styles.wrapActive]}>
      <Icon 
        size={22} 
        strokeWidth={active ? 2.5 : 2} 
        color={active ? colors.accent : colors.textSecondary} 
      />
    </View>
  );
}

export const TabIcons = {
  feed: Home,
  discover: Compass,
  backlog: Library,
  notifications: Bell,
  profile: User,
};

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  wrapActive: {
    backgroundColor: `${colors.accent}15`, // subtle tint of accent
  },
});
