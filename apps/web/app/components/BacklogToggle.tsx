"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { useState } from "react";
// Minimal inline BacklogModal component to avoid missing module error
export function BacklogModal({
  onClose,
}: {
  gameId: Id<"games">;
  existingItem?: {
    _id: Id<"backlogItems">;
    status: string;
    platform?: string;
    notes?: string;
    priority?: number;
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-black/60 absolute inset-0" onClick={onClose} />
      <div className="relative bg-stone-900 p-6 rounded-xl w-full max-w-md z-10">
        <h3 className="text-lg font-semibold mb-4">Add to Backlog</h3>
        <p className="mb-4">Add this game to your backlog (preview modal).</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-stone-700">
            Cancel
          </button>
          <button
            onClick={() => {
              // TODO: call Convex mutation to create backlog entry
              // Example: useMutation(api.backlog.create) from the parent or add logic here.
              onClose();
            }}
            className="px-4 py-2 rounded bg-blue-500 text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

interface BacklogToggleProps {
  gameId: Id<"games">;
}

export function BacklogToggle({ gameId }: BacklogToggleProps) {
  const [showModal, setShowModal] = useState(false);
  const backlogItem = useQuery(api.backlog.getForCurrentUserAndGame, { gameId });
  const removeBacklog = useMutation(api.backlog.removeByGameId);
  const currentUser = useQuery(api.users.current);

  const isInBacklog = backlogItem !== null && backlogItem !== undefined;

  const handleClick = () => {
    if (!currentUser) {
      // Redirect to sign in or show message
      alert("Please sign in to manage your backlog");
      return;
    }

    if (isInBacklog) {
      // Remove from backlog
      removeBacklog({ gameId }).catch((error) => {
        console.error("Failed to remove from backlog:", error);
      });
    } else {
      // Open modal to add to backlog
      setShowModal(true);
    }
  };

  const getStatusDisplay = () => {
    if (!backlogItem) return null;
    
    const statusLabels: Record<string, { label: string; color: string }> = {
      want_to_play: { label: "Want to Play", color: "text-blue-400" },
      playing: { label: "Playing", color: "text-green-400" },
      completed: { label: "Completed", color: "text-purple-400" },
      dropped: { label: "Dropped", color: "text-red-400" },
      on_hold: { label: "On Hold", color: "text-yellow-400" },
    };

    const status = statusLabels[backlogItem.status] || { label: backlogItem.status, color: "text-stone-400" };
    
    return (
      <span className={`text-sm font-medium ${status.color}`}>
        {status.label}
      </span>
    );
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
          isInBacklog
            ? "border border-white/20 bg-stone-800/60 text-white hover:bg-stone-700/60"
            : "border border-white/20 text-white hover:border-blue-400 hover:bg-stone-800/40"
        }`}
      >
        <svg
          className="h-5 w-5"
          fill={isInBacklog ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        {isInBacklog ? (
          <span className="flex items-center gap-2">
            In Backlog
            {getStatusDisplay()}
          </span>
        ) : (
          "Add to Backlog"
        )}
      </button>

      {showModal && (
        <BacklogModal
          gameId={gameId}
          existingItem={backlogItem ?? undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
