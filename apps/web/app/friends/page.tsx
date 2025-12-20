"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

function formatUserLabel(user: { name: string; username: string }) {
  return `${user.name} (@${user.username})`;
}

export default function FriendsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();

  const friends = useQuery(api.friends.listFriends, currentUser ? { limit: 50 } : "skip");
  const incoming = useQuery(
    api.friends.listIncomingRequests,
    currentUser ? { limit: 50 } : "skip",
  );
  const outgoing = useQuery(
    api.friends.listOutgoingRequests,
    currentUser ? { limit: 50 } : "skip",
  );

  const removeFriend = useMutation(api.friends.removeFriend);
  const respondToRequest = useMutation(api.friends.respondToRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const sendRequest = useMutation(api.friends.sendRequest);

  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingIds, setWorkingIds] = useState<Set<string>>(new Set());

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
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1
            className="text-[var(--bkl-color-text-primary)] mb-2"
            style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
          >
            Friends
          </h1>
          <p
            className="text-[var(--bkl-color-text-secondary)]"
            style={{ fontSize: "var(--bkl-font-size-sm)" }}
          >
            Manage your friends and requests
          </p>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-[var(--bkl-radius-md)] border border-[var(--bkl-color-feedback-error)]/40 bg-[var(--bkl-color-feedback-error)]/10 px-4 py-3">
            <p className="text-sm text-[var(--bkl-color-feedback-error)]">{actionError}</p>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)]">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="incoming">Requests</TabsTrigger>
            <TabsTrigger value="outgoing">Sent</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6">
            {friends === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading friends…</p>
            ) : friends.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No friends yet.</p>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => {
                  const isWorking = workingIds.has(String(friend._id));
                  return (
                    <div
                      key={friend._id}
                      className="flex items-center justify-between gap-4 rounded-[var(--bkl-radius-lg)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] p-4"
                    >
                      <div>
                        <Link
                          href={`/profile/${friend.username}`}
                          className="text-[var(--bkl-color-text-primary)] hover:underline"
                          style={{ fontWeight: "var(--bkl-font-weight-medium)" }}
                        >
                          {formatUserLabel({ name: friend.name, username: friend.username })}
                        </Link>
                      </div>
                      <Button
                        variant="outline"
                        className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                        disabled={isWorking}
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="incoming" className="mt-6">
            {incoming === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading requests…</p>
            ) : incoming.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No incoming requests.</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((entry) => {
                  const requestKey = String(entry.requestId);
                  const isWorking = workingIds.has(requestKey);
                  return (
                    <div
                      key={entry.requestId}
                      className="flex items-center justify-between gap-4 rounded-[var(--bkl-radius-lg)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] p-4"
                    >
                      <div>
                        <Link
                          href={`/profile/${entry.requester.username}`}
                          className="text-[var(--bkl-color-text-primary)] hover:underline"
                          style={{ fontWeight: "var(--bkl-font-weight-medium)" }}
                        >
                          {formatUserLabel({ name: entry.requester.name, username: entry.requester.username })}
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90 text-[var(--bkl-color-bg-primary)]"
                          disabled={isWorking}
                          onClick={() => handleRespond(entry.requestId, "accept")}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                          disabled={isWorking}
                          onClick={() => handleRespond(entry.requestId, "decline")}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-6">
            {outgoing === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading sent requests…</p>
            ) : outgoing.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No sent requests.</p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((entry) => {
                  const requestKey = String(entry.requestId);
                  const isWorking = workingIds.has(requestKey);
                  return (
                    <div
                      key={entry.requestId}
                      className="flex items-center justify-between gap-4 rounded-[var(--bkl-radius-lg)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] p-4"
                    >
                      <div>
                        <Link
                          href={`/profile/${entry.recipient.username}`}
                          className="text-[var(--bkl-color-text-primary)] hover:underline"
                          style={{ fontWeight: "var(--bkl-font-weight-medium)" }}
                        >
                          {formatUserLabel({ name: entry.recipient.name, username: entry.recipient.username })}
                        </Link>
                      </div>
                      <Button
                        variant="outline"
                        className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                        disabled={isWorking}
                        onClick={() => handleCancel(entry.requestId)}
                      >
                        Cancel
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <div className="mb-4">
              <Input
                placeholder="Search by name or username…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)]"
              />
            </div>

            {searchResults === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading users…</p>
            ) : filteredSearchResults.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No users found.</p>
            ) : (
              <div className="space-y-3">
                {filteredSearchResults.map((user) => {
                  const isWorking = workingIds.has(String(user._id));
                  return (
                    <div
                      key={user._id}
                      className="flex items-center justify-between gap-4 rounded-[var(--bkl-radius-lg)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-secondary)] p-4"
                    >
                      <div>
                        <Link
                          href={`/profile/${user.username}`}
                          className="text-[var(--bkl-color-text-primary)] hover:underline"
                          style={{ fontWeight: "var(--bkl-font-weight-medium)" }}
                        >
                          {formatUserLabel({ name: user.name, username: user.username })}
                        </Link>
                      </div>
                      <Button
                        className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90 text-[var(--bkl-color-bg-primary)]"
                        disabled={isWorking}
                        onClick={() => handleSend(user._id)}
                      >
                        Add friend
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
