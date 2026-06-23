import {
  BellOff,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  UserCheck,
  AtSign,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Screen } from "@/src/ui/primitives";
import { LoadingState } from "@/src/ui/LoadingState";
import { HudBadge, HudDivider, CornerMarkers, TabButton } from "@/src/ui/hud";
import { C, FONT_MONO, FONT_HEADING, FONT_BODY } from "@binnacle/design-tokens";
import { formatDate } from "@/src/lib/format";
import { View, Text, ScrollView, Pressable } from "@/src/tw";
import { Image } from "@/src/tw/image";

const TYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  like: { icon: Heart, color: C.red, label: "liked your review" },
  comment: { icon: MessageSquare, color: C.gold, label: "commented on your review" },
  follow: { icon: UserPlus, color: C.cyan, label: "followed you" },
  friend_request: { icon: UserPlus, color: C.cyan, label: "sent you a friend request" },
  friend_accepted: { icon: UserCheck, color: C.green, label: "accepted your friend request" },
  mention: { icon: AtSign, color: C.accent, label: "mentioned you" },
};

function NotificationRow({ notification }: { notification: any }) {
  const actor = useQuery(api.users.getPublicProfile, { userId: notification.actorId });
  const markAsRead = useMutation(api.notifications.markAsRead);

  const meta = TYPE_META[notification.type] ?? { icon: BellOff, color: C.textMuted, label: notification.type };
  const Icon = meta.icon;
  const isUnread = !notification.read;

  return (
    <Pressable
      onPress={() => {
        if (isUnread) {
          void markAsRead({ notificationId: notification._id });
        }
      }}
      style={{
        position: "relative",
        borderWidth: 1,
        borderColor: isUnread ? `${C.gold}55` : C.border,
        backgroundColor: isUnread ? `${C.gold}08` : C.surface,
        borderRadius: 2,
        padding: 14,
        gap: 12,
      }}
    >
      <CornerMarkers size={6} color={isUnread ? C.gold : C.borderLight} />

      <View className="flex-row" style={{ gap: 12 }}>
        {/* Avatar with icon badge */}
        <View style={{ position: "relative" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: C.bgAlt,
              borderWidth: 1,
              borderColor: C.borderLight,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {actor?.avatarUrl ? (
              <Image source={{ uri: actor.avatarUrl }} style={{ width: 40, height: 40 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontFamily: FONT_HEADING, fontSize: 16, color: C.gold, fontWeight: "300" }}>
                {(actor?.name ?? "?")[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: 9999,
              backgroundColor: C.bg,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={11} color={meta.color} strokeWidth={2.5} />
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, gap: 3 }}>
          <View className="flex-row flex-wrap" style={{ gap: 4 }}>
            <Text style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: "400", color: C.text }}>
              {actor?.name ?? "Someone"}
            </Text>
            <Text style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: "300", color: C.textMuted }}>
              {meta.label}
            </Text>
          </View>
          <Text style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
            {formatDate(notification.createdAt)}
          </Text>
        </View>

        {/* Unread indicator */}
        {isUnread ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 9999,
              backgroundColor: C.gold,
              marginTop: 4,
              shadowColor: C.gold,
              shadowOpacity: 0.5,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function NotificationsTab() {
  const notifications = useQuery(api.notifications.list, { limit: 40 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    if (activeTab === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, activeTab]);

  if (notifications === undefined || unreadCount === undefined) {
    return <LoadingState label="Loading notifications..." />;
  }

  const total = notifications.length;
  const unread = unreadCount.count;

  return (
    <Screen>
      <ScrollView contentContainerClassName="px-4 py-4 gap-4 pb-24">
        {/* Header */}
        <View style={{ gap: 12 }}>
          <HudBadge color={C.accent}>Signals</HudBadge>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: "200", color: C.text, letterSpacing: -0.5 }}>
              Notifications
            </Text>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Text style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: C.textMuted, fontWeight: "400" }}>
                {total} TOTAL
              </Text>
              {unread > 0 ? (
                <Text style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: C.gold, fontWeight: "600" }}>
                  {unread} UNREAD
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Mark all read */}
        {unread > 0 ? (
          <Pressable
            onPress={() => void markAllAsRead({})}
            className="flex-row items-center self-start active:opacity-70"
            style={{
              borderWidth: 1,
              borderColor: `${C.gold}44`,
              borderRadius: 2,
              paddingHorizontal: 14,
              paddingVertical: 8,
              gap: 8,
            }}
          >
            <CheckCheck size={14} color={C.gold} strokeWidth={2} />
            <Text style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold, fontWeight: "600" }}>
              Mark all read
            </Text>
          </Pressable>
        ) : null}

        {/* Tabs */}
        <View className="flex-row" style={{ gap: 0 }}>
          <TabButton label="All" active={activeTab === "all"} onPress={() => setActiveTab("all")} count={total} icon={undefined} />
          <TabButton label="Unread" active={activeTab === "unread"} onPress={() => setActiveTab("unread")} count={unread} icon={undefined} />
        </View>

        <HudDivider />

        {/* Notifications list */}
        {filteredNotifications.length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: C.borderLight,
              borderRadius: 2,
              padding: 32,
              alignItems: "center",
              gap: 12,
            }}
          >
            <CornerMarkers size={8} color={C.borderLight} />
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: C.bgAlt,
                borderWidth: 1,
                borderColor: C.borderLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeTab === "unread" && unread === 0 ? (
                <CheckCheck size={24} color={C.green} strokeWidth={1.5} />
              ) : (
                <BellOff size={24} color={C.textDim} strokeWidth={1.5} />
              )}
            </View>
            <Text style={{ fontFamily: FONT_HEADING, fontSize: 18, color: C.textMuted, fontWeight: "300" }}>
              {activeTab === "unread" && unread === 0 ? "All caught up" : "All quiet"}
            </Text>
            <Text style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textDim, textAlign: "center" }}>
              {activeTab === "unread" && unread === 0
                ? "You've read everything. Nice work."
                : "New likes, comments, and follows will appear here."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredNotifications.map((notification) => (
              <NotificationRow key={`${notification._id}`} notification={notification} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
