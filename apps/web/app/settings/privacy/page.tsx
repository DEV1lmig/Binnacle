"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type Visibility = "public" | "friends" | "private";

export default function SettingsPrivacyPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  const privacySettings = useQuery(api.privacy.getSettings, currentUser ? {} : "skip");
  const updatePrivacySettings = useMutation(api.privacy.updateSettings);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  const handleSavePrivacy = async (patch: {
    profileVisibility?: Visibility;
    backlogVisibility?: Visibility;
    reviewsVisibility?: Visibility;
    activityVisibility?: Visibility;
    showStats?: boolean;
    allowFriendRequests?: "everyone" | "friends_of_friends" | "nobody";
    showOnlineStatus?: boolean;
  }) => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      await updatePrivacySettings(patch);
      setSuccessMessage("Settings saved!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const profileVisibility = (privacySettings?.profileVisibility ?? "public") as Visibility;
  const backlogVisibility = (privacySettings?.backlogVisibility ?? profileVisibility) as Visibility;
  const reviewsVisibility = (privacySettings?.reviewsVisibility ?? profileVisibility) as Visibility;
  const activityVisibility = (privacySettings?.activityVisibility ?? profileVisibility) as Visibility;
  const allowFriendRequests = (privacySettings?.allowFriendRequests ?? "everyone") as
    | "everyone"
    | "friends_of_friends"
    | "nobody";
  const showStats = (privacySettings?.showStats ?? true) as boolean;
  const showOnlineStatus = (privacySettings?.showOnlineStatus ?? true) as boolean;

  return (
    <>
      {successMessage && (
        <div className="mb-4 p-3 bg-[var(--bkl-color-feedback-success)]/20 border border-[var(--bkl-color-feedback-success)] rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--bkl-color-feedback-success)]" />
          <span className="text-[var(--bkl-color-feedback-success)] text-sm">{successMessage}</span>
        </div>
      )}

      <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--bkl-color-text-primary)]">Privacy</CardTitle>
          <CardDescription className="text-[var(--bkl-color-text-secondary)]">
            Control who can see your profile and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[var(--bkl-color-text-primary)]">Profile Visibility</Label>
            <Select
              value={profileVisibility}
              onValueChange={(value) =>
                handleSavePrivacy({ profileVisibility: value as Visibility })
              }
              disabled={saving}
            >
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[var(--bkl-color-text-primary)]">Backlog Visibility</Label>
            <Select
              value={backlogVisibility}
              onValueChange={(value) =>
                handleSavePrivacy({ backlogVisibility: value as Visibility })
              }
              disabled={saving}
            >
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[var(--bkl-color-text-primary)]">Reviews Visibility</Label>
            <Select
              value={reviewsVisibility}
              onValueChange={(value) =>
                handleSavePrivacy({ reviewsVisibility: value as Visibility })
              }
              disabled={saving}
            >
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[var(--bkl-color-text-primary)]">Activity Visibility</Label>
            <Select
              value={activityVisibility}
              onValueChange={(value) =>
                handleSavePrivacy({ activityVisibility: value as Visibility })
              }
              disabled={saving}
            >
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can view</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[var(--bkl-color-text-primary)]">Friend Requests</Label>
            <Select
              value={allowFriendRequests}
              onValueChange={(value) =>
                handleSavePrivacy({
                  allowFriendRequests: value as "everyone" | "friends_of_friends" | "nobody",
                })
              }
              disabled={saving}
            >
              <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="friends_of_friends">Friends of friends</SelectItem>
                <SelectItem value="nobody">Nobody</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[var(--bkl-color-text-primary)]">Show Stats</Label>
              <p className="text-xs text-[var(--bkl-color-text-disabled)]">
                Controls whether your profile shows counts and charts
              </p>
            </div>
            <Switch
              checked={showStats}
              onCheckedChange={(checked) => handleSavePrivacy({ showStats: checked })}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[var(--bkl-color-text-primary)]">Show Online Status</Label>
              <p className="text-xs text-[var(--bkl-color-text-disabled)]">
                Lets others see when you&apos;re online
              </p>
            </div>
            <Switch
              checked={showOnlineStatus}
              onCheckedChange={(checked) => handleSavePrivacy({ showOnlineStatus: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
