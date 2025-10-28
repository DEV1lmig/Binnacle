"use client";

import { useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import { useState, useEffect } from "react";

interface BacklogModalProps {
  gameId: Id<"games">;
  existingItem?: {
    _id: Id<"backlogItems">;
    status: string;
    platform?: string;
    notes?: string;
    priority?: number;
  };
  onClose: () => void;
}

const BACKLOG_STATUSES = [
  { value: "want_to_play", label: "Want to Play", icon: "📚", color: "bg-blue-500" },
  { value: "playing", label: "Playing", icon: "🎮", color: "bg-green-500" },
  { value: "completed", label: "Completed", icon: "✅", color: "bg-purple-500" },
  { value: "on_hold", label: "On Hold", icon: "⏸️", color: "bg-yellow-500" },
  { value: "dropped", label: "Dropped", icon: "❌", color: "bg-red-500" },
];

export function BacklogModal({ gameId, existingItem, onClose }: BacklogModalProps) {
  const addToBacklog = useMutation(api.backlog.add);
  const updateBacklog = useMutation(api.backlog.update);

  const [status, setStatus] = useState(existingItem?.status ?? "want_to_play");
  const [platform, setPlatform] = useState(existingItem?.platform ?? "");
  const [notes, setNotes] = useState(existingItem?.notes ?? "");
  const [priority, setPriority] = useState(existingItem?.priority ?? 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (existingItem) {
        await updateBacklog({
          backlogId: existingItem._id,
          status,
          platform: platform || undefined,
          notes: notes || undefined,
          priority,
          startedAt: status === "playing" ? Date.now() : undefined,
          completedAt: status === "completed" ? Date.now() : undefined,
        });
      } else {
        await addToBacklog({
          gameId,
          status,
          platform: platform || undefined,
          notes: notes || undefined,
          priority,
          startedAt: status === "playing" ? Date.now() : undefined,
          completedAt: status === "completed" ? Date.now() : undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save backlog item:", error);
      alert("Failed to save backlog item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-stone-900 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white">
              {existingItem ? "Update Backlog Item" : "Add to Backlog"}
            </h2>
            <p className="text-sm text-stone-400">
              Choose a status and optionally add notes
            </p>
          </div>

          {/* Status Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-stone-300">Status *</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BACKLOG_STATUSES.map((statusOption) => (
                <button
                  key={statusOption.value}
                  type="button"
                  onClick={() => setStatus(statusOption.value)}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                    status === statusOption.value
                      ? `${statusOption.color} border-transparent text-white`
                      : "border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                  }`}
                >
                  <span className="text-2xl">{statusOption.icon}</span>
                  <span className="text-sm font-semibold">{statusOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="platform" className="text-sm font-medium text-stone-300">
              Platform (optional)
            </label>
            <input
              id="platform"
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g., PS5, PC, Nintendo Switch"
              className="rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-white placeholder-stone-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          {/* Notes Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm font-medium text-stone-300">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this game..."
              rows={3}
              className="resize-none rounded-xl border border-white/10 bg-stone-800/60 px-4 py-3 text-white placeholder-stone-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          {/* Priority Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="priority" className="text-sm font-medium text-stone-300">
              Priority: {priority}
            </label>
            <input
              id="priority"
              type="range"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-700"
            />
            <div className="flex justify-between text-xs text-stone-500">
              <span>Low (1)</span>
              <span>High (5)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-stone-800/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : existingItem ? "Update" : "Add to Backlog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
