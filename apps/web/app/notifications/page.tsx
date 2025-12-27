"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NotificationItem } from "./components/NotificationItem";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CheckCheck, BellOff } from "lucide-react";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Id } from "@/convex/_generated/dataModel";

export default function NotificationsPage() {
  const { currentUser } = useCurrentUser();
  const notifications = useQuery(api.notifications.list, { limit: 50 });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  
  // We need to fetch actor details for each notification.
  // In a real app, we might do this via a joined query in Convex, 
  // but for now we'll fetch the users we need or rely on the notification data if it was enriched.
  // Actually, the current `list` query just returns the notification objects.
  // We need to fetch the actors. 
  // Optimization: The `list` query in `notifications.ts` should probably return enriched data 
  // or we can use `useQueries` (if available) or just `useQuery` for each unique actor.
  // Given the constraints, let's update the `list` query in `notifications.ts` to return actor info 
  // OR we can just fetch all relevant users in a single batch query if we had one.
  // For simplicity in this phase, let's assume we might need to update the backend to return actor info,
  // but since I can't easily change the backend in this "UI only" step without context switching,
  // I will use a separate component that fetches the user for each item, or just display basic info.
  // Wait, I CAN change the backend, I just did in Phase 6A. 
  // Let's check if I can quickly patch `notifications.ts` to include actor info.
  // Actually, `NotificationItem` takes `actor` as a prop.
  // I'll create a wrapper component `NotificationItemContainer` that fetches the user.
  
  const handleMarkAllRead = async () => {
    await markAllAsRead({});
  };

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--bkl-radius-lg)]" />
        ))}
      </div>
    );
  }

  const isLoading = notifications === undefined;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 
            className="text-[var(--bkl-color-text-primary)]"
            style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
          >
            Notifications
          </h1>
          {notifications && notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors text-[length:var(--bkl-font-size-sm)] font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[var(--bkl-radius-lg)] bg-[var(--bkl-color-bg-secondary)]" />
              ))}
            </>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bkl-color-bg-secondary)] flex items-center justify-center mb-4">
                <BellOff className="w-8 h-8 text-[var(--bkl-color-text-disabled)]" />
              </div>
              <h3 className="text-[var(--bkl-color-text-primary)] font-semibold mb-2">
                No notifications yet
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)] max-w-xs">
                When you get likes, comments, or new followers, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItemContainer key={notification._id} notification={notification} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
