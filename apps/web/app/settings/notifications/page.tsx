"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";

export default function SettingsNotificationsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  
  const [preferences, setPreferences] = useState({
    email: {
      newFollower: true,
      friendRequest: true,
      likes: true,
      comments: true,
    },
    push: {
      newFollower: true,
      friendRequest: true,
      likes: true,
      comments: true,
    },
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
    const newPreferences = {
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [key]: !preferences[channel][key],
      },
    };

    setPreferences(newPreferences);

    try {
      await updatePreferences({ preferences: newPreferences });
      toast.success("Preferences updated");
    } catch (error) {
      console.error("Failed to update preferences", error);
      toast.error("Failed to update preferences");
      // Revert on error
      setPreferences(preferences);
    }
  };

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--bkl-color-text-primary)]">Email Notifications</CardTitle>
          <CardDescription className="text-[var(--bkl-color-text-secondary)]">
            Choose what updates you want to receive via email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="email-follows" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">New Followers</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone starts following you
              </span>
            </Label>
            <Switch
              id="email-follows"
              checked={preferences.email.newFollower}
              onCheckedChange={() => handleToggle("email", "newFollower")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="email-requests" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Friend Requests</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone sends you a friend request
              </span>
            </Label>
            <Switch
              id="email-requests"
              checked={preferences.email.friendRequest}
              onCheckedChange={() => handleToggle("email", "friendRequest")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="email-likes" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Likes</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone likes your reviews
              </span>
            </Label>
            <Switch
              id="email-likes"
              checked={preferences.email.likes}
              onCheckedChange={() => handleToggle("email", "likes")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="email-comments" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Comments</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone comments on your reviews
              </span>
            </Label>
            <Switch
              id="email-comments"
              checked={preferences.email.comments}
              onCheckedChange={() => handleToggle("email", "comments")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--bkl-color-text-primary)]">Push Notifications</CardTitle>
          <CardDescription className="text-[var(--bkl-color-text-secondary)]">
            Choose what updates you want to receive on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="push-follows" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">New Followers</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone starts following you
              </span>
            </Label>
            <Switch
              id="push-follows"
              checked={preferences.push.newFollower}
              onCheckedChange={() => handleToggle("push", "newFollower")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="push-requests" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Friend Requests</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone sends you a friend request
              </span>
            </Label>
            <Switch
              id="push-requests"
              checked={preferences.push.friendRequest}
              onCheckedChange={() => handleToggle("push", "friendRequest")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="push-likes" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Likes</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone likes your reviews
              </span>
            </Label>
            <Switch
              id="push-likes"
              checked={preferences.push.likes}
              onCheckedChange={() => handleToggle("push", "likes")}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="push-comments" className="flex flex-col space-y-1">
              <span className="text-[var(--bkl-color-text-primary)] font-medium">Comments</span>
              <span className="text-[var(--bkl-color-text-secondary)] text-xs font-normal">
                When someone comments on your reviews
              </span>
            </Label>
            <Switch
              id="push-comments"
              checked={preferences.push.comments}
              onCheckedChange={() => handleToggle("push", "comments")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
