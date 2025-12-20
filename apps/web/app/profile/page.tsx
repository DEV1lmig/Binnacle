"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Settings, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Button } from "@/app/components/ui/button";
import { ProfileDashboardContent } from "./components/ProfileDashboardContent";
import { EditProfileDialog, type ProfileFormValues } from "./components/EditProfileDialog";
import { EditTopGamesDialog, type TopGameFormEntry } from "./components/EditTopGamesDialog";
import { updateClerkProfile } from "./actions";

const RECENT_ACTIVITY_LIMIT = 5;

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong. Please try again.";
}

export default function ProfilePage() {
  const { currentUser } = useCurrentUser();

  const dashboard = useQuery(
    api.users.dashboard,
    currentUser ? { userId: currentUser._id, recentLimit: RECENT_ACTIVITY_LIMIT } : "skip",
  );

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
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 text-center">
          <p className="text-[var(--bkl-color-text-secondary)]">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (dashboard === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 text-center">
          <p className="text-[var(--bkl-color-text-secondary)]">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (dashboard === null) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 text-center">
          <p className="text-[var(--bkl-color-text-secondary)]">We could not load your profile. Please try again later.</p>
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

    // Check if anything changed
    if (nextName === dashboard.user.name && nextBio === (dashboard.user.bio ?? "")) {
      setProfileError(null);
      setIsEditProfileOpen(false);
      return;
    }

    try {
      setProfileSubmitting(true);
      setProfileError(null);

      // Update via Clerk's metadata (source of truth)
      const clerkResult = await updateClerkProfile({
        displayName: nextName,
        bio: nextBio,
      });

      if (!clerkResult.success) {
        setProfileError(clerkResult.error || "Failed to update profile");
        return;
      }

      // Also update Convex directly for immediate UI feedback
      // (Webhook will eventually sync, but this provides instant updates)
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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
        onClick={() => setIsEditProfileOpen(true)}
      >
        <Settings className="w-4 h-4" />
        Edit profile
      </Button>
      <Button
        className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90 text-[var(--bkl-color-bg-primary)]"
        onClick={() => setIsTopGamesOpen(true)}
      >
        <Sparkles className="w-4 h-4" />
        Manage top games
      </Button>
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
