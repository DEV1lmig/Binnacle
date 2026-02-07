"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Search, UserPlus, Users, Send, Inbox } from "lucide-react";
import {
  C,
  FONT_HEADING,
  FONT_MONO,
  FONT_BODY,
  FONT_IMPORT_URL,
} from "@/app/lib/design-system";
import {
  CornerMarkers,
  GrainOverlay,
  HudBadge,
  HudDivider,
} from "@/app/lib/design-primitives";

// ---------------------------------------------------------------------------
// Scroll-reveal hook
// ---------------------------------------------------------------------------
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      setReady(true);
      return;
    }
    setReady(true);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, className: ready ? `friends-reveal ${visible ? "visible" : ""}` : "" };
}

function formatUserLabel(user: { name: string; username: string }) {
  return `${user.name} (@${user.username})`;
}

// ---------------------------------------------------------------------------
// User card component
// ---------------------------------------------------------------------------
function UserCard({
  name,
  username,
  avatarUrl,
  actions,
}: {
  name: string;
  username: string;
  avatarUrl?: string;
  actions: React.ReactNode;
}) {
  return (
    <div
      className="relative flex items-center gap-4 p-4 transition-all"
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        background: C.surface,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.gold;
        e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <CornerMarkers size={8} />
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback
          style={{
            backgroundColor: C.bgAlt,
            color: C.textMuted,
            fontFamily: FONT_MONO,
            fontSize: 12,
          }}
        >
          {name?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${username}`}
          className="block truncate transition-colors"
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 400,
            color: C.text,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}
        >
          {name}
        </Link>
        <span
          className="block truncate"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: C.textDim,
            letterSpacing: "0.03em",
          }}
        >
          @{username}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyTabState({ icon: Icon, message }: { icon: typeof Users; message: string }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center py-16"
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        background: C.surface,
      }}
    >
      <CornerMarkers />
      <Icon style={{ width: 40, height: 40, color: C.textDim, marginBottom: 12 }} />
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          fontWeight: 300,
          color: C.textMuted,
        }}
      >
        {message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton for friends page
// ---------------------------------------------------------------------------
function FriendsPageSkeleton() {
  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6">
          <Skeleton className="h-5 w-20 mb-3" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
          <Skeleton className="h-9 w-40 mb-2" style={{ backgroundColor: C.surface }} />
          <Skeleton className="h-4 w-56" style={{ backgroundColor: C.surface }} />
        </div>
        <Skeleton className="h-10 w-80 mb-6" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4"
              style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
            >
              <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" style={{ backgroundColor: C.bgAlt }} />
                <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
              </div>
              <Skeleton className="h-8 w-20" style={{ backgroundColor: C.bgAlt, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FriendsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  const friends = useQuery(api.friends.listFriends, currentUser ? { limit: 50 } : "skip");
  const incoming = useQuery(api.friends.listIncomingRequests, currentUser ? { limit: 50 } : "skip");
  const outgoing = useQuery(api.friends.listOutgoingRequests, currentUser ? { limit: 50 } : "skip");

  const removeFriend = useMutation(api.friends.removeFriend);
  const respondToRequest = useMutation(api.friends.respondToRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const sendRequest = useMutation(api.friends.sendRequest);

  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingIds, setWorkingIds] = useState<Set<string>>(new Set());

  const headerReveal = useReveal();
  const contentReveal = useReveal();

  const searchResults = useQuery(
    api.users.search,
    currentUser ? { query: searchQuery, limit: 20 } : "skip",
  );

  const filteredSearchResults = useMemo(() => {
    const results = searchResults ?? [];
    return results.filter((user) => !currentUser || user._id !== currentUser._id);
  }, [currentUser, searchResults]);

  const markWorking = (id: string, next: boolean) => {
    setWorkingIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const handleRemoveFriend = async (targetUserId: Id<"users">) => {
    setActionError(null);
    markWorking(String(targetUserId), true);
    try {
      await removeFriend({ targetUserId });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to remove friend");
    } finally {
      markWorking(String(targetUserId), false);
    }
  };

  const handleRespond = async (requestId: Id<"friendRequests">, action: "accept" | "decline") => {
    setActionError(null);
    markWorking(String(requestId), true);
    try {
      await respondToRequest({ requestId, action });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to respond to request");
    } finally {
      markWorking(String(requestId), false);
    }
  };

  const handleCancel = async (requestId: Id<"friendRequests">) => {
    setActionError(null);
    markWorking(String(requestId), true);
    try {
      await cancelRequest({ requestId });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to cancel request");
    } finally {
      markWorking(String(requestId), false);
    }
  };

  const handleSend = async (recipientId: Id<"users">) => {
    setActionError(null);
    markWorking(String(recipientId), true);
    try {
      await sendRequest({ recipientId });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to send request");
    } finally {
      markWorking(String(recipientId), false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <FriendsPageSkeleton />;
  }

  const incomingCount = incoming?.length ?? 0;

  return (
    <>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .friends-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .friends-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .friends-reveal { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="absolute"
            style={{
              top: "-20%",
              left: "-10%",
              width: "50%",
              height: "50%",
              background: `radial-gradient(circle, ${C.goldDim}15 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "-20%",
              right: "-10%",
              width: "40%",
              height: "40%",
              background: `radial-gradient(circle, ${C.accentDim}10 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
        </div>

        <GrainOverlay id="friends-grain" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8">
          {/* Header */}
          <div
            ref={headerReveal.ref}
            className={headerReveal.className}
            style={{
              borderBottom: `1px solid ${C.border}`,
              padding: "24px 0 20px",
            }}
          >
            <HudBadge color={C.accent}>Network</HudBadge>
            <h1
              className="mt-3"
              style={{
                fontFamily: FONT_HEADING,
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 200,
                color: C.text,
                letterSpacing: "-0.01em",
              }}
            >
              Friends
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: C.textMuted,
                letterSpacing: "0.08em",
              }}
            >
              {friends?.length ?? 0} CONNECTIONS
              {incomingCount > 0 && (
                <span style={{ color: C.cyan, marginLeft: 12 }}>
                  {incomingCount} PENDING
                </span>
              )}
            </p>
          </div>

          {/* Error banner */}
          {actionError && (
            <div
              className="mt-4 px-4 py-3"
              style={{
                border: `1px solid ${C.red}66`,
                borderRadius: 2,
                backgroundColor: C.red + "15",
              }}
            >
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  color: C.red,
                  letterSpacing: "0.03em",
                }}
              >
                {actionError}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div
            ref={contentReveal.ref}
            className={`mt-6 ${contentReveal.className}`}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList
                className="w-full sm:w-auto"
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: 3,
                }}
              >
                {[
                  { value: "friends", label: "Friends", icon: Users, count: friends?.length },
                  { value: "incoming", label: "Requests", icon: Inbox, count: incomingCount > 0 ? incomingCount : undefined },
                  { value: "outgoing", label: "Sent", icon: Send, count: outgoing?.length && outgoing.length > 0 ? outgoing.length : undefined },
                  { value: "search", label: "Search", icon: Search },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1.5 transition-all"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      borderRadius: 2,
                      color: activeTab === tab.value ? C.bg : C.textMuted,
                      backgroundColor: activeTab === tab.value ? C.gold : "transparent",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full"
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          backgroundColor: activeTab === tab.value ? C.bg + "33" : C.gold + "33",
                          color: activeTab === tab.value ? C.bg : C.gold,
                        }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Friends tab */}
              <TabsContent value="friends" className="mt-5">
                {friends === undefined ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <EmptyTabState icon={Users} message="No friends yet. Search for people to connect with." />
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <UserCard
                        key={friend._id}
                        name={friend.name}
                        username={friend.username}
                        avatarUrl={(friend as Record<string, unknown>).avatarUrl as string | undefined}
                        actions={
                          <Button
                            className="transition-all"
                            disabled={workingIds.has(String(friend._id))}
                            onClick={() => handleRemoveFriend(friend._id)}
                            style={{
                              backgroundColor: "transparent",
                              border: `1px solid ${C.border}`,
                              borderRadius: 2,
                              color: C.textMuted,
                              fontFamily: FONT_MONO,
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              padding: "6px 14px",
                              height: "auto",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.red;
                              e.currentTarget.style.color = C.red;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.textMuted;
                            }}
                          >
                            Remove
                          </Button>
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Incoming requests tab */}
              <TabsContent value="incoming" className="mt-5">
                {incoming === undefined ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : incoming.length === 0 ? (
                  <EmptyTabState icon={Inbox} message="No incoming requests." />
                ) : (
                  <div className="space-y-3">
                    {incoming.map((entry) => {
                      const isWorking = workingIds.has(String(entry.requestId));
                      return (
                        <UserCard
                          key={entry.requestId}
                          name={entry.requester.name}
                          username={entry.requester.username}
                          avatarUrl={(entry.requester as Record<string, unknown>).avatarUrl as string | undefined}
                          actions={
                            <>
                              <Button
                                disabled={isWorking}
                                onClick={() => handleRespond(entry.requestId, "accept")}
                                style={{
                                  backgroundColor: C.gold,
                                  color: C.bg,
                                  borderRadius: 2,
                                  fontFamily: FONT_MONO,
                                  fontSize: 10,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  padding: "6px 14px",
                                  height: "auto",
                                  border: "none",
                                  boxShadow: `0 0 12px ${C.bloom}`,
                                }}
                              >
                                Accept
                              </Button>
                              <Button
                                disabled={isWorking}
                                onClick={() => handleRespond(entry.requestId, "decline")}
                                style={{
                                  backgroundColor: "transparent",
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 2,
                                  color: C.textMuted,
                                  fontFamily: FONT_MONO,
                                  fontSize: 10,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  padding: "6px 14px",
                                  height: "auto",
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Sent requests tab */}
              <TabsContent value="outgoing" className="mt-5">
                {outgoing === undefined ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : outgoing.length === 0 ? (
                  <EmptyTabState icon={Send} message="No sent requests." />
                ) : (
                  <div className="space-y-3">
                    {outgoing.map((entry) => {
                      const isWorking = workingIds.has(String(entry.requestId));
                      return (
                        <UserCard
                          key={entry.requestId}
                          name={entry.recipient.name}
                          username={entry.recipient.username}
                          avatarUrl={(entry.recipient as Record<string, unknown>).avatarUrl as string | undefined}
                          actions={
                            <Button
                              disabled={isWorking}
                              onClick={() => handleCancel(entry.requestId)}
                              style={{
                                backgroundColor: "transparent",
                                border: `1px solid ${C.border}`,
                                borderRadius: 2,
                                color: C.textMuted,
                                fontFamily: FONT_MONO,
                                fontSize: 10,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                padding: "6px 14px",
                                height: "auto",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = C.red;
                                e.currentTarget.style.color = C.red;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = C.border;
                                e.currentTarget.style.color = C.textMuted;
                              }}
                            >
                              Cancel
                            </Button>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Search tab */}
              <TabsContent value="search" className="mt-5">
                <div className="relative mb-5 max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ width: 14, height: 14, color: C.textDim }}
                  />
                  <Input
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    style={{
                      backgroundColor: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      color: C.text,
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      letterSpacing: "0.03em",
                      height: 36,
                    }}
                  />
                </div>

                {searchResults === undefined ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredSearchResults.length === 0 ? (
                  <EmptyTabState icon={Search} message="No users found." />
                ) : (
                  <div className="space-y-3">
                    {filteredSearchResults.map((user) => (
                      <UserCard
                        key={user._id}
                        name={user.name}
                        username={user.username}
                        avatarUrl={(user as Record<string, unknown>).avatarUrl as string | undefined}
                        actions={
                          <Button
                            disabled={workingIds.has(String(user._id))}
                            onClick={() => handleSend(user._id)}
                            style={{
                              backgroundColor: C.gold,
                              color: C.bg,
                              borderRadius: 2,
                              fontFamily: FONT_MONO,
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              padding: "6px 14px",
                              height: "auto",
                              border: "none",
                              boxShadow: `0 0 12px ${C.bloom}`,
                            }}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Add
                          </Button>
                        }
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
