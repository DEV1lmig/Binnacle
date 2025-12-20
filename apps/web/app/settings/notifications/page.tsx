"use client";

import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function SettingsNotificationsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  return (
    <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--bkl-color-text-primary)]">Notifications</CardTitle>
        <CardDescription className="text-[var(--bkl-color-text-secondary)]">
          Manage notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--bkl-color-text-secondary)]">Coming soon.</p>
      </CardContent>
    </Card>
  );
}
