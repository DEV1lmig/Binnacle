"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers, HudDivider } from "@/app/lib/design-primitives";

type Visibility = "public" | "friends" | "private";

const VISIBILITY_OPTIONS: { label: string; value: Visibility }[] = [
  { label: "Public - Anyone can view", value: "public" },
  { label: "Friends Only", value: "friends" },
  { label: "Private - Only you", value: "private" },
];

const FRIEND_REQUEST_OPTIONS = [
  { label: "Everyone", value: "everyone" },
  { label: "Friends of friends", value: "friends_of_friends" },
  { label: "Nobody", value: "nobody" },
] as const;

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
  const allowFriendRequests = (privacySettings?.allowFriendRequests ?? "everyone") as "everyone" | "friends_of_friends" | "nobody";
  const showStats = (privacySettings?.showStats ?? true) as boolean;
  const showOnlineStatus = (privacySettings?.showOnlineStatus ?? true) as boolean;

  const selectTriggerStyle: React.CSSProperties = {
    background: C.bgAlt,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    color: C.text,
    fontFamily: FONT_BODY,
    fontSize: 13,
  };

  return (
    <>
      {successMessage && (
        <div
          className="flex items-center gap-2"
          style={{
            padding: "10px 14px",
            background: `${C.green}15`,
            border: `1px solid ${C.green}44`,
            borderRadius: 2,
            marginBottom: 8,
          }}
        >
          <Check className="w-4 h-4" style={{ color: C.green }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.green }}>{successMessage}</span>
        </div>
      )}

      <div
        className="relative"
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}
      >
        <CornerMarkers size={10} />

        <div className="mb-4">
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text, marginBottom: 4 }}>
            Privacy
          </h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>
            Control who can see your profile and content
          </p>
        </div>

        <HudDivider />

        <div className="flex flex-col gap-5 mt-5">
          {/* Visibility selects */}
          {([
            { label: "Profile Visibility", value: profileVisibility, key: "profileVisibility" },
            { label: "Backlog Visibility", value: backlogVisibility, key: "backlogVisibility" },
            { label: "Reviews Visibility", value: reviewsVisibility, key: "reviewsVisibility" },
            { label: "Activity Visibility", value: activityVisibility, key: "activityVisibility" },
          ] as const).map((item) => (
            <div key={item.key} className="flex flex-col gap-2">
              <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
                {item.label}
              </label>
              <Select
                value={item.value}
                onValueChange={(value) => handleSavePrivacy({ [item.key]: value as Visibility })}
                disabled={saving}
              >
                <SelectTrigger style={selectTriggerStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Friend Requests */}
          <div className="flex flex-col gap-2">
            <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
              Friend Requests
            </label>
            <Select
              value={allowFriendRequests}
              onValueChange={(value) =>
                handleSavePrivacy({ allowFriendRequests: value as "everyone" | "friends_of_friends" | "nobody" })
              }
              disabled={saving}
            >
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRIEND_REQUEST_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div style={{ height: 1, background: C.border }} />

          {/* Show Stats toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: C.text }}>Show Stats</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 300, color: C.textDim }}>
                Controls whether your profile shows counts and charts
              </span>
            </div>
            <Switch
              checked={showStats}
              onCheckedChange={(checked) => handleSavePrivacy({ showStats: checked })}
              disabled={saving}
            />
          </div>

          {/* Show Online Status toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: C.text }}>Show Online Status</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 300, color: C.textDim }}>
                Lets others see when you&apos;re online
              </span>
            </div>
            <Switch
              checked={showOnlineStatus}
              onCheckedChange={(checked) => handleSavePrivacy({ showOnlineStatus: checked })}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </>
  );
}
