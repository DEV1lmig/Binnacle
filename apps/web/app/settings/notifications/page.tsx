"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { Mail, Bell } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers, HudDivider } from "@/app/lib/design-primitives";

const TOGGLE_ITEMS = [
  { key: "newFollower" as const, label: "New Followers", desc: "When someone starts following you" },
  { key: "friendRequest" as const, label: "Friend Requests", desc: "When someone sends you a friend request" },
  { key: "likes" as const, label: "Likes", desc: "When someone likes your reviews" },
  { key: "comments" as const, label: "Comments", desc: "When someone comments on your reviews" },
] as const;

export default function SettingsNotificationsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const [preferences, setPreferences] = useState({
    email: { newFollower: true, friendRequest: true, likes: true, comments: true },
    push: { newFollower: true, friendRequest: true, likes: true, comments: true },
  });

  useEffect(() => {
    if (currentUser?.notificationPreferences) {
      setPreferences({
        email: {
          newFollower: currentUser.notificationPreferences.email?.newFollower ?? true,
          friendRequest: currentUser.notificationPreferences.email?.friendRequest ?? true,
          likes: currentUser.notificationPreferences.email?.likes ?? true,
          comments: currentUser.notificationPreferences.email?.comments ?? true,
        },
        push: {
          newFollower: currentUser.notificationPreferences.push?.newFollower ?? true,
          friendRequest: currentUser.notificationPreferences.push?.friendRequest ?? true,
          likes: currentUser.notificationPreferences.push?.likes ?? true,
          comments: currentUser.notificationPreferences.push?.comments ?? true,
        },
      });
    }
  }, [currentUser]);

  const handleToggle = async (
    channel: "email" | "push",
    key: "newFollower" | "friendRequest" | "likes" | "comments"
  ) => {
    const prev = preferences;
    const newPreferences = {
      ...preferences,
      [channel]: { ...preferences[channel], [key]: !preferences[channel][key] },
    };
    setPreferences(newPreferences);
    try {
      await updatePreferences({ preferences: newPreferences });
      toast.success("Preferences updated");
    } catch (error) {
      console.error("Failed to update preferences", error);
      toast.error("Failed to update preferences");
      setPreferences(prev);
    }
  };

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Email Notifications */}
      <NotificationCard
        icon={Mail}
        title="Email Notifications"
        description="Choose what updates you want to receive via email."
        channel="email"
        preferences={preferences}
        onToggle={handleToggle}
      />

      {/* Push Notifications */}
      <NotificationCard
        icon={Bell}
        title="Push Notifications"
        description="Choose what updates you want to receive on your device."
        channel="push"
        preferences={preferences}
        onToggle={handleToggle}
      />
    </div>
  );
}

function NotificationCard({
  icon: Icon,
  title,
  description,
  channel,
  preferences,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  channel: "email" | "push";
  preferences: {
    email: { newFollower: boolean; friendRequest: boolean; likes: boolean; comments: boolean };
    push: { newFollower: boolean; friendRequest: boolean; likes: boolean; comments: boolean };
  };
  onToggle: (channel: "email" | "push", key: "newFollower" | "friendRequest" | "likes" | "comments") => void;
}) {
  return (
    <div className="relative" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}>
      <CornerMarkers size={10} />

      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-4 h-4" style={{ color: C.gold }} />
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text }}>{title}</h2>
      </div>
      <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted, marginBottom: 16 }}>
        {description}
      </p>

      <HudDivider />

      <div className="flex flex-col gap-0 mt-4">
        {TOGGLE_ITEMS.map((item, idx) => (
          <div key={item.key}>
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: C.text }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 300, color: C.textDim }}>
                  {item.desc}
                </span>
              </div>
              <Switch
                checked={preferences[channel][item.key]}
                onCheckedChange={() => onToggle(channel, item.key)}
              />
            </div>
            {idx < TOGGLE_ITEMS.length - 1 && (
              <div style={{ height: 1, background: C.border }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
