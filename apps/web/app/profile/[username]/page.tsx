"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
  Clock,
  Inbox,
  Flag,
  Loader2,
} from "lucide-react";
import { ReportDialog } from "@/app/components/ReportDialog";
import {
  ProfileDashboardContent,
  ProfilePageSkeleton,
  type ProfileDashboardData,
} from "../components/ProfileDashboardContent";
import {
  C,
  FONT_HEADING,
  FONT_MONO,
  FONT_BODY,
  FONT_IMPORT_URL,
} from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const usernameParam =
    typeof params.username === "string"
      ? params.username
      : Array.isArray(params.username)
        ? params.username[0]
        : undefined;

  const profileData = useQuery(
    api.users.dashboard,
    usernameParam ? { username: usernameParam } : "skip",
  );

  const followUser = useMutation(api.followers.follow);
  const unfollowUser = useMutation(api.followers.unfollow);
  const sendFriendRequest = useMutation(api.friends.sendRequest);
  const blockUser = useMutation(api.blocking.block);
  const unblockUser = useMutation(api.blocking.unblock);

  const friendRelationship = useQuery(
    api.friends.relationship,
    profileData ? { targetUserId: profileData.user._id } : "skip",
  );

  const viewerHasBlocked = useQuery(
    api.blocking.isBlocked,
    profileData && !profileData.viewerIsSelf
      ? { targetUserId: profileData.user._id }
      : "skip",
  );
  const viewerIsBlockedBy = useQuery(
    api.blocking.isBlockedBy,
    profileData && !profileData.viewerIsSelf
      ? { targetUserId: profileData.user._id }
      : "skip",
  );

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [friendActionError, setFriendActionError] = useState<string | null>(null);
  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);
  const [blockActionError, setBlockActionError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!profileData) return;

    setIsFollowing((prev) => {
      const next = profileData.viewerFollows;
      if (isUpdatingFollow && prev !== null) return prev;
      return prev === next ? prev : next;
    });

    setFollowerCount((prev) => {
      const next = profileData.followerCount;
      if (isUpdatingFollow && prev !== null) return prev;
      return prev === next ? prev : next;
    });
  }, [isUpdatingFollow, profileData]);

  const handleFollowToggle = async () => {
    if (!profileData || profileData.viewerIsSelf) return;

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

  const handleSendFriendRequest = async () => {
    if (!profileData || profileData.viewerIsSelf) return;

    setFriendActionError(null);
    setIsSendingFriendRequest(true);
    try {
      await sendFriendRequest({ recipientId: profileData.user._id });
    } catch (error) {
      setFriendActionError(
        error instanceof Error ? error.message : "Failed to send friend request",
      );
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!profileData || profileData.viewerIsSelf) return;
    if (viewerHasBlocked === undefined) return;

    setBlockActionError(null);
    setIsUpdatingBlock(true);
    try {
      const targetUserId = profileData.user._id;
      if (viewerHasBlocked) {
        await unblockUser({ targetUserId });
      } else {
        await blockUser({ targetUserId });
      }
    } catch (error) {
      setBlockActionError(
        error instanceof Error ? error.message : "Failed to update block status",
      );
    } finally {
      setIsUpdatingBlock(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Edge-case screens
  // ---------------------------------------------------------------------------

  if (!usernameParam) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: C.bg }}
      >
        <div
          className="relative text-center px-8 py-10"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.surface,
          }}
        >
          <CornerMarkers />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
            Missing username.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4"
            style={{
              padding: "8px 20px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              background: "transparent",
              color: C.textMuted,
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (profileData === undefined) {
    return <ProfilePageSkeleton />;
  }

  if (profileData === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: C.bg }}
      >
        <div
          className="relative text-center px-8 py-10"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.surface,
          }}
        >
          <CornerMarkers />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
            This profile is private.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4"
            style={{
              padding: "8px 20px",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              background: "transparent",
              color: C.textMuted,
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Blocked state
  // ---------------------------------------------------------------------------

  if (viewerIsBlockedBy) {
    const blockedDashboard: ProfileDashboardData = {
      ...profileData,
      followerCount: followerCount ?? profileData.followerCount,
    };

    const blockedBanner = (
      <div
        className="mt-3 px-4 py-3 relative"
        style={{
          border: `1px solid ${C.red}33`,
          borderRadius: 2,
          background: `${C.red}08`,
        }}
      >
        <CornerMarkers size={5} color={`${C.red}44`} />
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.06em",
            color: C.red,
          }}
        >
          You are blocked by this user.
        </p>
      </div>
    );

    const blockedActions = (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                background: "transparent",
                color: C.textDim,
                cursor: "pointer",
              }}
            >
              <MoreHorizontal style={{ width: 16, height: 16 }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
            }}
          >
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setReportOpen(true);
              }}
              className="flex items-center gap-2 cursor-pointer"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.06em",
                color: C.textMuted,
              }}
            >
              <Flag style={{ width: 12, height: 12 }} />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );

    return (
      <>
        <ProfileDashboardContent
          data={blockedDashboard}
          socialActions={blockedActions}
          errorBanner={blockedBanner}
        />
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={profileData.user._id}
        />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Viewer has blocked this user
  // ---------------------------------------------------------------------------

  if (viewerHasBlocked) {
    const blockedByViewerDashboard: ProfileDashboardData = {
      ...profileData,
      followerCount: followerCount ?? profileData.followerCount,
    };

    const unblockActions = (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBlockToggle}
          disabled={isUpdatingBlock}
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
            cursor: isUpdatingBlock ? "not-allowed" : "pointer",
            opacity: isUpdatingBlock ? 0.5 : 1,
          }}
        >
          {isUpdatingBlock ? (
            <Loader2
              className="animate-spin"
              style={{ width: 14, height: 14 }}
            />
          ) : (
            <ShieldOff style={{ width: 14, height: 14 }} />
          )}
          Unblock
        </button>
      </div>
    );

    return (
      <ProfileDashboardContent
        data={blockedByViewerDashboard}
        socialActions={unblockActions}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Normal public profile view (not self, not blocked)
  // ---------------------------------------------------------------------------

  const dashboardWithOptimisticCounts: ProfileDashboardData = {
    ...profileData,
    followerCount: followerCount ?? profileData.followerCount,
    viewerFollows: isFollowing ?? profileData.viewerFollows,
  };

  // Build social actions row
  const socialActions = !profileData.viewerIsSelf ? (
    <div className="flex flex-wrap items-center gap-2">
      {/* Follow / Following button */}
      <button
        type="button"
        onClick={handleFollowToggle}
        disabled={isUpdatingFollow}
        className="flex items-center gap-2 px-4 py-2"
        style={{
          border: "none",
          borderRadius: 2,
          background: (isFollowing ?? profileData.viewerFollows) ? C.surface : C.gold,
          color: (isFollowing ?? profileData.viewerFollows) ? C.textMuted : C.bg,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: isUpdatingFollow ? "not-allowed" : "pointer",
          fontWeight: 500,
          boxShadow: (isFollowing ?? profileData.viewerFollows) ? "none" : `0 0 16px ${C.bloom}`,
          ...(isFollowing ?? profileData.viewerFollows
            ? { border: `1px solid ${C.border}` }
            : {}),
          opacity: isUpdatingFollow ? 0.6 : 1,
          transition: "opacity 0.2s, box-shadow 0.2s",
        }}
      >
        {isUpdatingFollow ? (
          <Loader2
            className="animate-spin"
            style={{ width: 14, height: 14 }}
          />
        ) : (isFollowing ?? profileData.viewerFollows) ? (
          <UserCheck style={{ width: 14, height: 14 }} />
        ) : (
          <UserPlus style={{ width: 14, height: 14 }} />
        )}
        {(isFollowing ?? profileData.viewerFollows) ? "Following" : "Follow"}
      </button>

      {/* Friend relationship button */}
      {friendRelationship?.status === "none" ? (
        <button
          type="button"
          onClick={handleSendFriendRequest}
          disabled={isSendingFriendRequest}
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
            cursor: isSendingFriendRequest ? "not-allowed" : "pointer",
            opacity: isSendingFriendRequest ? 0.5 : 1,
            transition: "border-color 0.2s, color 0.2s",
          }}
        >
          {isSendingFriendRequest ? (
            <Loader2
              className="animate-spin"
              style={{ width: 14, height: 14 }}
            />
          ) : (
            <UserPlus style={{ width: 14, height: 14 }} />
          )}
          Add Friend
        </button>
      ) : friendRelationship?.status === "outgoing" ? (
        <span
          className="flex items-center gap-2 px-4 py-2"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.textDim,
          }}
        >
          <Clock style={{ width: 14, height: 14 }} />
          Request Sent
        </span>
      ) : friendRelationship?.status === "incoming" ? (
        <span
          className="flex items-center gap-2 px-4 py-2"
          style={{
            border: `1px solid ${C.cyan}33`,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.cyan,
          }}
        >
          <Inbox style={{ width: 14, height: 14 }} />
          Request Received
        </span>
      ) : friendRelationship?.status === "friends" ? (
        <span
          className="flex items-center gap-2 px-4 py-2"
          style={{
            border: `1px solid ${C.green}33`,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.green,
          }}
        >
          <UserCheck style={{ width: 14, height: 14 }} />
          Friends
        </span>
      ) : null}

      {/* Block button */}
      <button
        type="button"
        onClick={handleBlockToggle}
        disabled={isUpdatingBlock || viewerHasBlocked === undefined}
        className="flex items-center gap-2 px-4 py-2"
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          background: "transparent",
          color: C.textDim,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: isUpdatingBlock ? "not-allowed" : "pointer",
          opacity: isUpdatingBlock ? 0.5 : 1,
          transition: "border-color 0.2s, color 0.2s",
        }}
      >
        {isUpdatingBlock ? (
          <Loader2
            className="animate-spin"
            style={{ width: 14, height: 14 }}
          />
        ) : (
          <Shield style={{ width: 14, height: 14 }} />
        )}
        Block
      </button>

      {/* More menu (Report) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              background: "transparent",
              color: C.textDim,
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
          >
            <MoreHorizontal style={{ width: 16, height: 16 }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
          }}
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setReportOpen(true);
            }}
            className="flex items-center gap-2 cursor-pointer"
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.06em",
              color: C.textMuted,
            }}
          >
            <Flag style={{ width: 12, height: 12 }} />
            Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  // Build error banners
  const errorBanner = (
    <>
      {friendActionError && (
        <div
          className="mt-2 px-3 py-2 relative"
          style={{
            border: `1px solid ${C.red}33`,
            borderRadius: 2,
            background: `${C.red}08`,
          }}
        >
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.06em",
              color: C.red,
            }}
          >
            {friendActionError}
          </p>
        </div>
      )}
      {blockActionError && (
        <div
          className="mt-2 px-3 py-2 relative"
          style={{
            border: `1px solid ${C.red}33`,
            borderRadius: 2,
            background: `${C.red}08`,
          }}
        >
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.06em",
              color: C.red,
            }}
          >
            {blockActionError}
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      <ProfileDashboardContent
        data={dashboardWithOptimisticCounts}
        socialActions={socialActions}
        errorBanner={errorBanner}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="user"
        targetId={profileData.user._id}
      />
    </>
  );
}
