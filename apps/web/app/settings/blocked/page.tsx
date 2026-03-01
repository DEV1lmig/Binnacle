"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Loader2, UserX } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

export default function SettingsBlockedPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const blocked = useQuery(api.blocking.listBlocked, currentUser ? {} : "skip");
  const unblock = useMutation(api.blocking.unblock);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  return (
    <div
      className="relative"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: "24px",
      }}
    >
      <CornerMarkers size={10} />

      <div className="mb-4">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text, marginBottom: 4 }}>
          Blocked Users
        </h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>
          Users you block won&apos;t appear in your feed or search.
        </p>
      </div>

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, margin: "16px 0" }} />

      <div className="flex flex-col gap-2">
        <p style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
          Blocked Users
        </p>

        {blocked === undefined ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.gold }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted }}>Loading...</span>
          </div>
        ) : blocked.length === 0 ? (
          <div
            className="relative flex flex-col items-center gap-3 py-8"
            style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 2 }}
          >
            <CornerMarkers size={6} />
            <UserX className="w-8 h-8" style={{ color: C.textDim }} />
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted }}>No blocked users.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {blocked.map((entry) => (
              <div
                key={entry.blocked._id}
                className="flex items-center justify-between gap-3"
                style={{
                  background: C.bgAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "10px 14px",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderLight; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              >
                <div className="min-w-0">
                  <p className="truncate" style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: C.text }}>
                    {entry.blocked.name}
                  </p>
                  <p className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, letterSpacing: "0.04em" }}>
                    @{entry.blocked.username}
                  </p>
                </div>
                <button
                  disabled={unblockingUserId === String(entry.blocked._id)}
                  onClick={async () => {
                    try {
                      setUnblockingUserId(String(entry.blocked._id));
                      await unblock({ targetUserId: entry.blocked._id });
                    } finally {
                      setUnblockingUserId(null);
                    }
                  }}
                  style={{
                    padding: "6px 14px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    color: C.text,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: unblockingUserId === String(entry.blocked._id) ? "not-allowed" : "pointer",
                    opacity: unblockingUserId === String(entry.blocked._id) ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
                >
                  {unblockingUserId === String(entry.blocked._id) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Unblock"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
