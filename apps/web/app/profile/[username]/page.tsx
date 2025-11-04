"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";

export default function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const router = useRouter();
  const userProfile = useQuery(api.users.profileByUsername, { username: params.username });

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">User not found</p>
          <Button
            onClick={() => router.back()}
            className="mt-4 bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const user = userProfile.user;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Profile Header */}
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24 border-2 border-[var(--bkl-color-accent-primary)]">
                <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-white text-3xl">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1
                  className="text-[var(--bkl-color-text-primary)]"
                  style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
                >
                  {user.name}
                </h1>
                <p
                  className="text-[var(--bkl-color-text-secondary)]"
                  style={{ fontSize: "var(--bkl-font-size-sm)" }}
                >
                  @{user.username}
                </p>
                <div className="flex gap-8 mt-4">
                  <div>
                    <p
                      className="text-[var(--bkl-color-accent-primary)]"
                      style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-bold)" }}
                    >
                      {userProfile.stats.reviewCount}
                    </p>
                    <p className="text-[var(--bkl-color-text-disabled)]">Reviews</p>
                  </div>
                  <div>
                    <p
                      className="text-[var(--bkl-color-accent-primary)]"
                      style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-bold)" }}
                    >
                      {userProfile.followerCount}
                    </p>
                    <p className="text-[var(--bkl-color-text-disabled)]">Followers</p>
                  </div>
                </div>
              </div>
            </div>

            <Button className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90">
              Follow
            </Button>
          </div>
        </div>

        <div className="text-center py-16">
          <p className="text-[var(--bkl-color-text-secondary)]">User profile content coming soon...</p>
        </div>
      </div>
    </div>
  );
}
