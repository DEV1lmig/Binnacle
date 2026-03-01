"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Search, ArrowLeft, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay, HudBadge, HudDivider } from "@/app/lib/design-primitives";

function useReveal(className: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [cls, setCls] = useState<string | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setCls(`${className} ${className}-visible`);
      return;
    }
    setCls(className);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCls(`${className} ${className}-visible`);
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [className]);

  return { ref, className: cls };
}

export default function DiscoverPeoplePage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers = useQuery(api.users.search, { query: searchQuery, limit: 50 });
  const filteredUsers = (allUsers || []).filter((user) => !currentUser || user._id !== currentUser._id);
  const isLoading = allUsers === undefined;

  const r0 = useReveal("people-reveal");
  const r1 = useReveal("people-reveal");

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: C.bg }}>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .people-reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .people-reveal-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .people-reveal { opacity: 1; transform: none; transition: none; } }
      `}</style>
      <GrainOverlay id="people-grain" />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed" style={{ top: -100, left: -100, width: 400, height: 400, background: `radial-gradient(circle, ${C.gold}12 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="pointer-events-none fixed" style={{ bottom: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${C.accent}10 0%, transparent 70%)`, filter: "blur(60px)" }} />

      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className={`mb-6${r0.className ? ` ${r0.className}` : ""}`} ref={r0.ref}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4"
            style={{ color: C.textMuted, transition: "color 0.2s", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Back to Discover
            </span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <HudBadge color={C.cyan}>Network</HudBadge>
          </div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 200, color: C.text, letterSpacing: "-0.01em" }}>
            Discover People
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted, marginTop: 4 }}>
            Find and connect with other gamers
          </p>
        </div>

        <HudDivider />

        {/* Search Bar */}
        <div className="my-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textDim }} />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: C.text,
                fontFamily: FONT_BODY,
                fontSize: 14,
                fontWeight: 300,
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${C.gold}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        {/* Results */}
        <div ref={r1.ref} {...(r1.className ? { className: r1.className } : {})}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}>
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full" style={{ background: C.bgAlt }} />
                    <Skeleton className="w-24 h-4" style={{ background: C.bgAlt }} />
                    <Skeleton className="w-16 h-3" style={{ background: C.bgAlt }} />
                  </div>
                </div>
              ))}
            </div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="relative py-16 flex flex-col items-center gap-4" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }}>
              <CornerMarkers size={10} />
              <Users className="w-10 h-10" style={{ color: C.textDim }} />
              <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
                No users found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="relative cursor-pointer"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: 24,
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                  }}
                  onClick={() => router.push(`/profile/${user.username}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.gold;
                    e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <CornerMarkers size={6} />
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback style={{ background: C.bgAlt, color: C.gold, fontFamily: FONT_MONO, fontSize: 16, fontWeight: 400 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-center w-full">
                      <p className="truncate" style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 300, color: C.text }}>
                        {user.name}
                      </p>
                      <p className="truncate mb-4" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, letterSpacing: "0.06em" }}>
                        @{user.username}
                      </p>

                      <div className="flex justify-center gap-6 mb-4">
                        <div className="text-center">
                          <p style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 400, color: C.gold }}>0</p>
                          <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textDim }}>Reviews</p>
                        </div>
                        <div className="text-center">
                          <p style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 400, color: C.gold }}>0</p>
                          <p style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textDim }}>Followers</p>
                        </div>
                      </div>

                      <button
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: C.gold,
                          color: C.bg,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          fontWeight: 400,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          border: "none",
                          borderRadius: 2,
                          cursor: "pointer",
                          boxShadow: `0 0 12px ${C.bloom}`,
                          transition: "opacity 0.2s",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/profile/${user.username}`);
                        }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
