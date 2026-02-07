"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Settings, Sparkles, Loader2, Shield } from "lucide-react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { ProfileDashboardContent, ProfilePageSkeleton } from "./components/ProfileDashboardContent";
import { EditProfileDialog, type ProfileFormValues } from "./components/EditProfileDialog";
import { EditTopGamesDialog, type TopGameFormEntry } from "./components/EditTopGamesDialog";
import { updateClerkProfile } from "./actions";
import { C, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

const RECENT_ACTIVITY_LIMIT = 5;

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}

export default function ProfilePage() {
  const { currentUser } = useCurrentUser();

  const dashboard = useQuery(
    api.users.dashboard,
    currentUser ? { userId: currentUser._id, recentLimit: RECENT_ACTIVITY_LIMIT } : "skip",
  );

  const roleInfo = useQuery(api.admin.getCurrentUserRole);
  const isAdmin = roleInfo?.isAdmin === true;

  const updateProfile = useMutation(api.users.updateProfile);
  const setTopGames = useMutation(api.users.setTopGames);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTopGamesOpen, setIsTopGamesOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [topGamesError, setTopGamesError] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [topGamesSubmitting, setTopGamesSubmitting] = useState(false);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div
          className="relative text-center px-8 py-10"
          style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}
        >
          <CornerMarkers />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
            Please log in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (dashboard === undefined) {
    return <ProfilePageSkeleton />;
  }

  if (dashboard === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div
          className="relative text-center px-8 py-10"
          style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}
        >
          <CornerMarkers />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
            Your profile is currently unavailable. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const initialProfileValues: ProfileFormValues = {
    name: dashboard.user.name,
    bio: dashboard.user.bio ?? "",
  };

  const initialTopGames: TopGameFormEntry[] = dashboard.topGames.map((entry) => ({
    gameId: entry.game._id,
    title: entry.game.title,
    coverUrl: entry.game.coverUrl ?? undefined,
    releaseYear: entry.game.releaseYear ?? undefined,
    aggregatedRating: entry.game.aggregatedRating ?? undefined,
    note: entry.note ?? "",
  }));

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    const nextName = values.name.trim();
    const nextBio = values.bio?.trim() ?? "";

    if (nextName === dashboard.user.name && nextBio === (dashboard.user.bio ?? "")) {
      setProfileError(null);
      setIsEditProfileOpen(false);
      return;
    }

    try {
      setProfileSubmitting(true);
      setProfileError(null);

      const clerkResult = await updateClerkProfile({
        displayName: nextName,
        bio: nextBio,
      });

      if (!clerkResult.success) {
        setProfileError(clerkResult.error || "Failed to update profile");
        return;
      }

      const convexPayload: { name?: string; bio?: string } = {};

      if (nextName !== dashboard.user.name) {
        convexPayload.name = nextName;
      }

      if (nextBio !== (dashboard.user.bio ?? "")) {
        convexPayload.bio = nextBio || undefined;
      }

      if (Object.keys(convexPayload).length > 0) {
        await updateProfile(convexPayload);
      }

      setIsEditProfileOpen(false);
    } catch (error) {
      setProfileError(extractErrorMessage(error));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleTopGamesSubmit = async (
    entries: Array<{ gameId: TopGameFormEntry["gameId"]; note?: string }>,
  ) => {
    try {
      setTopGamesSubmitting(true);
      setTopGamesError(null);
      await setTopGames({ entries });
      setIsTopGamesOpen(false);
    } catch (error) {
      setTopGamesError(extractErrorMessage(error));
    } finally {
      setTopGamesSubmitting(false);
    }
  };

  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap">
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2"
          style={{
            border: `1px solid ${C.accent}33`,
            borderRadius: 2,
            background: `${C.accent}11`,
            color: C.accent,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.background = `${C.accent}22`;
            e.currentTarget.style.boxShadow = `0 0 16px ${C.accent}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${C.accent}33`;
            e.currentTarget.style.background = `${C.accent}11`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <Shield style={{ width: 14, height: 14 }} />
          Admin Panel
        </Link>
      )}
      <button
        type="button"
        onClick={() => setIsEditProfileOpen(true)}
        className="flex items-center gap-2 px-4 py-2"
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          background: "transparent",
          color: C.textMuted,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "border-color 0.2s, color 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.gold;
          e.currentTarget.style.color = C.text;
          e.currentTarget.style.boxShadow = `0 0 12px ${C.bloom}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.textMuted;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Settings style={{ width: 14, height: 14 }} />
        Edit Profile
      </button>
      <button
        type="button"
        onClick={() => setIsTopGamesOpen(true)}
        className="flex items-center gap-2 px-4 py-2"
        style={{
          border: "none",
          borderRadius: 2,
          background: C.gold,
          color: C.bg,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          fontWeight: 500,
          boxShadow: `0 0 16px ${C.bloom}`,
          transition: "opacity 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
          e.currentTarget.style.boxShadow = `0 0 24px ${C.bloom}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
        }}
      >
        <Sparkles style={{ width: 14, height: 14 }} />
        Manage Top Games
      </button>
    </div>
  );

  return (
    <>
      <ProfileDashboardContent data={dashboard} headerAction={headerAction} />

      <EditProfileDialog
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        initialValues={initialProfileValues}
        onSubmit={handleProfileSubmit}
        submitting={profileSubmitting}
        errorMessage={profileError}
      />

      <EditTopGamesDialog
        open={isTopGamesOpen}
        onOpenChange={setIsTopGamesOpen}
        initialGames={initialTopGames}
        onSubmit={handleTopGamesSubmit}
        submitting={topGamesSubmitting}
        errorMessage={topGamesError}
      />
    </>
  );
}
