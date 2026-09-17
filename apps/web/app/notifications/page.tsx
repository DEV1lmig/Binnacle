"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationItem } from "./components/NotificationItem";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CheckCheck, BellOff, Bell } from "lucide-react";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  C,
  FONT_HEADING,
  FONT_MONO,
  FONT_BODY,
} from "@/app/lib/design-system";
import {
  CornerMarkers,
  GrainOverlay,
  HudDivider,
} from "@/app/lib/design-primitives";
import { useScrollReveal } from "@/app/lib/useScrollReveal";
import { PageHero, Pill } from "@/app/components/playchive";


// ---------------------------------------------------------------------------
// Notification item container (fetches actor)
// ---------------------------------------------------------------------------
type NotificationDoc = {
  _id: Id<"notifications">;
  type: string;
  actorId: Id<"users">;
  targetType?: string;
  targetId?: string;
  message?: string;
  read: boolean;
  createdAt: number;
};

function NotificationItemContainer({ notification }: { notification: NotificationDoc }) {
  const actor = useQuery(api.users.getPublicProfile, { userId: notification.actorId });
  return <NotificationItem notification={notification} actor={actor} />;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function NotificationsPageSkeleton() {
  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6">
          <Skeleton className="h-5 w-28 mb-3" style={{ backgroundColor: C.surface, borderRadius: 12 }} />
          <Skeleton className="h-9 w-48 mb-2" style={{ backgroundColor: C.surface }} />
          <Skeleton className="h-4 w-32" style={{ backgroundColor: C.surface }} />
        </div>
        <Skeleton className="h-10 w-48 mb-6" style={{ backgroundColor: C.surface, borderRadius: 12 }} />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4"
              style={{ border: `1px solid ${C.border}`, borderRadius: 12 }}
            >
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" style={{ backgroundColor: C.bgAlt }} />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" style={{ backgroundColor: C.bgAlt }} />
                <Skeleton className="h-3 w-16" style={{ backgroundColor: C.bgAlt }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyNotifications() {
  return (
    <div
      className="relative flex flex-col items-center justify-center py-20"
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.surface,
      }}
    >
      <CornerMarkers />
      <BellOff style={{ width: 44, height: 44, color: C.textDim, marginBottom: 16 }} />
      <h3
        style={{
          fontFamily: FONT_HEADING,
          fontSize: 18,
          fontWeight: 400,
          color: C.text,
          marginBottom: 6,
        }}
      >
        No notifications yet
      </h3>
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          fontWeight: 400,
          color: C.textMuted,
          maxWidth: 280,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        When you get likes, comments, or new followers, they&apos;ll show up here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const notifications = useQuery(api.notifications.list, { limit: 50 });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const [activeTab, setActiveTab] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentReveal = useScrollReveal(contentRef, "notif-reveal");

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead({});
    } finally {
      setMarkingAll(false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <NotificationsPageSkeleton />;
  }

  const isLoading = notifications === undefined;
  const allNotifs = notifications ?? [];
  const unreadNotifs = allNotifs.filter((n) => !n.read);
  const unreadCount = unreadNotifs.length;

  return (
    <>
      <style>{`

        .notif-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .notif-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .notif-reveal { opacity: 1; transform: none; transition: none; }
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
              background: "none",
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
              background: "none",
              filter: "blur(60px)",
            }}
          />
        </div>

        <GrainOverlay id="notif-grain" />

        <PageHero tone="cobalt" compact eyebrow="Activity" title={unreadCount > 0 ? <><em>{unreadCount}</em> new for you.</> : <>You’re all <em>caught up</em>.</>} lede={`${allNotifs.length} notification${allNotifs.length === 1 ? "" : "s"} in total.`} aside={unreadCount > 0 ? <Pill tone="gold" size="sm" onClick={handleMarkAllRead} disabled={markingAll}><CheckCheck size={16} />Mark all read</Pill> : undefined} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8">
          {/* Header */}
          {/* Tabs + Content */}
          <div
            ref={contentRef}
            className={`mt-6 ${contentReveal}`}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 3,
                }}
              >
                {[
                  { value: "all", label: "All", icon: Bell, count: allNotifs.length > 0 ? allNotifs.length : undefined },
                  { value: "unread", label: "Unread", icon: BellOff, count: unreadCount > 0 ? unreadCount : undefined },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1.5 transition-all"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: "0.01em",
                      textTransform: "none",
                      borderRadius: 12,
                      color: activeTab === tab.value ? C.bg : C.textMuted,
                      backgroundColor: activeTab === tab.value ? C.gold : "transparent",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
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

              <HudDivider />

              <TabsContent value="all" className="mt-5">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 12 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-16" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allNotifs.length === 0 ? (
                  <EmptyNotifications />
                ) : (
                  <div className="space-y-3">
                    {allNotifs.map((notification) => (
                      <NotificationItemContainer key={notification._id} notification={notification} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unread" className="mt-5">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 12 }}
                      >
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" style={{ backgroundColor: C.bgAlt }} />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" style={{ backgroundColor: C.bgAlt }} />
                          <Skeleton className="h-3 w-16" style={{ backgroundColor: C.bgAlt }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : unreadNotifs.length === 0 ? (
                  <div
                    className="relative flex flex-col items-center justify-center py-16"
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      background: C.surface,
                    }}
                  >
                    <CornerMarkers />
                    <CheckCheck style={{ width: 40, height: 40, color: C.green, marginBottom: 12 }} />
                    <p
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 14,
                        fontWeight: 400,
                        color: C.textMuted,
                      }}
                    >
                      All caught up
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreadNotifs.map((notification) => (
                      <NotificationItemContainer key={notification._id} notification={notification} />
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
