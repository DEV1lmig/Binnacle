"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Users, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function NotificationItem({ notification, actor }: NotificationItemProps) {
  const router = useRouter();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead({ notificationId: notification._id });
    }

    // Navigation logic based on type/target
    if (notification.type === "follow" || notification.type === "friend_request" || notification.type === "friend_accepted") {
      if (actor?.username) {
        router.push(`/profile/${actor.username}`);
      }
    } else if (notification.targetType === "review" && notification.targetId) {
      router.push(`/review/${notification.targetId}`);
    } else if (notification.targetType === "game" && notification.targetId) {
      router.push(`/game/${notification.targetId}`);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "like":
        return <Heart className="w-4 h-4 text-[var(--bkl-color-feedback-error)] fill-current" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-[var(--bkl-color-accent-primary)]" />;
      case "follow":
      case "friend_request":
        return <UserPlus className="w-4 h-4 text-[var(--bkl-color-accent-secondary)]" />;
      case "friend_accepted":
        return <Users className="w-4 h-4 text-[var(--bkl-color-feedback-success)]" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-[var(--bkl-color-accent-tertiary)]" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-[var(--bkl-color-accent-primary)]" />;
    }
  };

  const getText = () => {
    const name = actor?.name || "Someone";
    switch (notification.type) {
      case "like":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> liked your review
          </span>
        );
      case "comment":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> commented on your review
          </span>
        );
      case "follow":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> started following you
          </span>
        );
      case "friend_request":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> sent you a friend request
          </span>
        );
      case "friend_accepted":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> accepted your friend request
          </span>
        );
      case "mention":
        return (
          <span>
            <span className="font-semibold text-[var(--bkl-color-text-primary)]">{name}</span> mentioned you
          </span>
        );
      default:
        return <span>{notification.message || "New notification"}</span>;
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-4 p-4 rounded-[var(--bkl-radius-lg)] border transition-all cursor-pointer",
        notification.read
          ? "bg-[var(--bkl-color-bg-primary)] border-transparent hover:bg-[var(--bkl-color-bg-secondary)]"
          : "bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-accent-primary)] shadow-[var(--bkl-shadow-sm)]"
      )}
    >
      <div className="relative">
        <Avatar className="w-10 h-10 border border-[var(--bkl-color-border)]">
          <AvatarImage src={actor?.avatarUrl} alt={actor?.name || "User"} />
          <AvatarFallback className="bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)]">
            {actor?.name?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-[var(--bkl-color-bg-primary)] rounded-full p-0.5 border border-[var(--bkl-color-border)]">
          {getIcon()}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[var(--bkl-color-text-secondary)] text-[length:var(--bkl-font-size-sm)] leading-relaxed">
          {getText()}
        </p>
        <p className="text-[var(--bkl-color-text-disabled)] text-[length:var(--bkl-font-size-xs)] mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-[var(--bkl-color-accent-primary)] mt-2 flex-shrink-0" />
      )}
    </div>
  );
}
