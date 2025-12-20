"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const usernameParam = typeof params.username === "string"
    ? params.username
    : Array.isArray(params.username)
      ? params.username[0]
      : undefined;

  const profileData = useQuery(
    api.users.dashboard,
    usernameParam ? { username: usernameParam } : "skip"
  );

  const followUser = useMutation(api.followers.follow);
  const unfollowUser = useMutation(api.followers.unfollow);

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  useEffect(() => {
    if (!profileData) {
      return;
    }

    setIsFollowing((prev) => {
      const next = profileData.viewerFollows;
      if (isUpdatingFollow && prev !== null) {
        return prev;
      }
      return prev === next ? prev : next;
    });

    setFollowerCount((prev) => {
      const next = profileData.followerCount;
      if (isUpdatingFollow && prev !== null) {
        return prev;
      }
      return prev === next ? prev : next;
    });
  }, [isUpdatingFollow, profileData]);

  const handleFollowToggle = async () => {
    if (!profileData || profileData.viewerIsSelf) {
      return;
    }

    const targetUserId = profileData.user._id;
    const nextFollowerCount = followerCount ?? profileData.followerCount;

    setIsUpdatingFollow(true);
    try {
      if (isFollowing) {
        await unfollowUser({ targetUserId });
        setIsFollowing(false);
        setFollowerCount(Math.max(0, nextFollowerCount - 1));
      } else {
        await followUser({ targetUserId });
        setIsFollowing(true);
        setFollowerCount(nextFollowerCount + 1);
      }
    } catch (error) {
      console.error("Failed to toggle follow state", error);
    } finally {
      setIsUpdatingFollow(false);
    }
  };

  if (!usernameParam) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Missing username.</p>
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

  if (!profileData) {
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

  const user = profileData.user;

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
                      {profileData.reviewStats.reviewCount}
                    </p>
                    <p className="text-[var(--bkl-color-text-disabled)]">Reviews</p>
                  </div>
                  <div>
                    <p
                      className="text-[var(--bkl-color-accent-primary)]"
                      style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-bold)" }}
                    >
                      {followerCount ?? profileData.followerCount}
                    </p>
                    <p className="text-[var(--bkl-color-text-disabled)]">Followers</p>
                  </div>
                </div>
              </div>
            </div>

            {!profileData.viewerIsSelf && (
              <Button
                className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
                onClick={handleFollowToggle}
                disabled={isUpdatingFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        <section className="space-y-6">
          <div>
            <h2
              className="text-[var(--bkl-color-text-primary)] font-[family-name:var(--bkl-font-serif)] mb-4"
              style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
            >
              Top Games
            </h2>
            {profileData.topGames.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData.topGames.map((entry) => (
                  <Card key={`${entry.game._id}-${entry.rank}`} className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-[var(--bkl-color-text-primary)]" style={{ fontSize: "var(--bkl-font-size-base)" }}>
                        <Badge className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">#{entry.rank}</Badge>
                        {entry.game.title}
                      </CardTitle>
                      {entry.note && (
                        <p className="text-xs text-[var(--bkl-color-text-secondary)] mt-2">{entry.note}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
                        onClick={() => router.push(`/game/${entry.game._id}`)}
                      >
                        View Game
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-6 text-center text-[var(--bkl-color-text-secondary)]">
                {user.username} has not pinned any top games yet.
              </div>
            )}
          </div>

          <div>
            <h2
              className="text-[var(--bkl-color-text-primary)] font-[family-name:var(--bkl-font-serif)] mb-4"
              style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
            >
              Recent Reviews
            </h2>
            {profileData.recentReviews.length ? (
              <div className="grid gap-4">
                {profileData.recentReviews.map((review) => (
                  <Card key={review._id} className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-[var(--bkl-color-text-primary)]" style={{ fontSize: "var(--bkl-font-size-base)" }}>
                        {review.game.title}
                        <Badge className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                          {review.rating.toFixed(1)} / 10
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-[var(--bkl-color-text-secondary)]">
                      {review.text ? review.text : "No review text provided."}
                      <Button
                        variant="outline"
                        className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
                        onClick={() => router.push(`/game/${review.game._id}`)}
                      >
                        View Game
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-6 text-center text-[var(--bkl-color-text-secondary)]">
                {user.username} has not shared any recent reviews.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
