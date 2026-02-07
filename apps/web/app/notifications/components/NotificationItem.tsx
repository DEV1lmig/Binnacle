"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Users, AtSign } from "lucide-react";
import { C, FONT_BODY, FONT_MONO } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

export type NotificationType = "follow" | "friend_request" | "friend_accepted" | "like" | "comment" | "mention";

export interface NotificationItemProps {
  notification: {
    _id: Id<"notifications">;
    type: string;
    actorId: Id<"users">;
    targetType?: string;
    targetId?: string;
    message?: string;
    read: boolean;
    createdAt: number;
  };
  actor?: {
    name: string;
    username: string;
    avatarUrl?: string;
  } | null;
}

const NOTIFICATION_ICONS: Record<string, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: C.red },
  comment: { icon: MessageCircle, color: C.gold },
  follow: { icon: UserPlus, color: C.cyan },
  friend_request: { icon: UserPlus, color: C.cyan },
  friend_accepted: { icon: Users, color: C.green },
  mention: { icon: AtSign, color: C.accent },
};

const NOTIFICATION_TEXT: Record<string, string> = {
  like: "liked your review",
  comment: "commented on your review",
  follow: "started following you",
  friend_request: "sent you a friend request",
  friend_accepted: "accepted your friend request",
  mention: "mentioned you",
};

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationItem({ notification, actor }: NotificationItemProps) {
  const router = useRouter();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead({ notificationId: notification._id });
    }

    if (
      notification.type === "follow" ||
      notification.type === "friend_request" ||
      notification.type === "friend_accepted"
    ) {
      if (actor?.username) {
        router.push(`/profile/${actor.username}`);
      }
    } else if (notification.targetType === "review" && notification.targetId) {
      router.push(`/review/${notification.targetId}`);
    } else if (notification.targetType === "game" && notification.targetId) {
      router.push(`/game/${notification.targetId}`);
    }
  };

  const iconEntry = NOTIFICATION_ICONS[notification.type];
  const IconComponent = iconEntry?.icon;
  const iconColor = iconEntry?.color ?? C.gold;
  const actionText = NOTIFICATION_TEXT[notification.type] ?? notification.message ?? "New notification";
  const actorName = actor?.name ?? "Someone";

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="relative flex items-start gap-4 p-4 cursor-pointer transition-all"
      style={{
        border: `1px solid ${notification.read ? C.border : C.gold + "55"}`,
        borderRadius: 2,
        background: notification.read ? C.surface : C.gold + "08",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.gold;
        e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = notification.read ? C.border : C.gold + "55";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <CornerMarkers size={6} />

      {/* Avatar + icon badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={actor?.avatarUrl} alt={actorName} />
          <AvatarFallback
            style={{
              backgroundColor: C.bgAlt,
              color: C.textMuted,
              fontFamily: FONT_MONO,
              fontSize: 12,
            }}
          >
            {actorName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {IconComponent && (
          <div
            className="absolute -bottom-1 -right-1 flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
            }}
          >
            <IconComponent
              style={{
                width: 11,
                height: 11,
                color: iconColor,
                ...(notification.type === "like" ? { fill: iconColor } : {}),
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 400, color: C.text }}>{actorName}</span>{" "}
          {actionText}
        </p>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: C.textDim,
            letterSpacing: "0.06em",
            marginTop: 4,
            display: "block",
          }}
        >
          {timeAgo(notification.createdAt)}
        </span>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div
          className="flex-shrink-0 mt-2"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: C.gold,
            boxShadow: `0 0 8px ${C.gold}66`,
          }}
        />
      )}
    </div>
  );
}
