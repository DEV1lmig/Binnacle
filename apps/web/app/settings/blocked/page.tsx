"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function SettingsBlockedPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  const blocked = useQuery(api.blocking.listBlocked, currentUser ? {} : "skip");
  const unblock = useMutation(api.blocking.unblock);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  return (
    <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--bkl-color-text-primary)]">Blocked users</CardTitle>
        <CardDescription className="text-[var(--bkl-color-text-secondary)]">
          Users you block won&apos;t appear in your feed or search.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label className="text-[var(--bkl-color-text-primary)]">Blocked users</Label>

          {blocked === undefined ? (
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">Loading…</p>
          ) : blocked.length === 0 ? (
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">No blocked users.</p>
          ) : (
            <div className="space-y-2">
              {blocked.map((entry) => (
                <div
                  key={entry.blocked._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-tertiary)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--bkl-color-text-primary)] truncate">
                      {entry.blocked.name}
                    </p>
                    <p className="text-xs text-[var(--bkl-color-text-secondary)] truncate">
                      @{entry.blocked.username}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                    disabled={unblockingUserId === String(entry.blocked._id)}
                    onClick={async () => {
                      try {
                        setUnblockingUserId(String(entry.blocked._id));
                        await unblock({ targetUserId: entry.blocked._id });
                      } finally {
                        setUnblockingUserId(null);
                      }
                    }}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
