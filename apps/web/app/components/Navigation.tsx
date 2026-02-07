"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type LucideIcon, Home, Search, Clipboard, User as UserIcon, Settings, LogOut, Users, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/app/context/CurrentUserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { C, FONT_HEADING, FONT_MONO } from "@/app/lib/design-system";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { currentUser: convexUser } = useCurrentUser();
  const { signOut } = useClerk();

  const incomingRequests = useQuery(
    api.friends.listIncomingRequests,
    convexUser ? { limit: 99 } : "skip",
  );
  const pendingFriendRequests = incomingRequests?.length ?? 0;

  const unreadNotifications = useQuery(
    api.notifications.getUnreadCount,
    convexUser ? {} : "skip"
  );
  const unreadCount = unreadNotifications?.count ?? 0;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`);

  type MobileNavItem = {
    path: string;
    icon: LucideIcon;
    label: string;
    badge?: number;
  };

  const mobileNavItems: MobileNavItem[] = [
    { path: '/feed', icon: Home, label: 'Home' },
    { path: '/discover', icon: Search, label: 'Discover' },
    { path: '/backlog', icon: Clipboard, label: 'Backlog' },
    { path: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isSignedIn) {
    return (
      <nav
        className="px-4 py-4 md:px-6"
        style={{
          backgroundColor: C.bg,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="transition-colors"
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 20,
              fontWeight: 200,
              letterSpacing: "-0.01em",
              color: C.gold,
            }}
          >
            Binnacle
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 transition-all"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.color = C.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.text;
              }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 transition-all"
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: C.bg,
                backgroundColor: C.gold,
                borderRadius: 2,
                boxShadow: `0 0 20px ${C.bloom}, 0 0 40px ${C.bloom}`,
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav
        className="px-4 py-4 md:px-6"
        style={{
          backgroundColor: C.bg,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 md:gap-8">
            <Link
              href="/feed"
              className="transition-colors"
              style={{
                fontFamily: FONT_HEADING,
                fontSize: 20,
                fontWeight: 200,
                letterSpacing: "-0.01em",
                color: C.gold,
              }}
            >
              Binnacle
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {([
                { href: "/feed", label: "Feed" },
                { href: "/friends", label: "Friends", badge: pendingFriendRequests },
                { href: "/backlog", label: "Backlog" },
                { href: "/discover", label: "Discover" },
                { href: "/notifications", label: "Notifications", badge: unreadCount },
              ] as const).map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      fontWeight: 400,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: active ? C.gold : C.textMuted,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = C.text;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = C.textMuted;
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.label}
                      {"badge" in item && (item.badge ?? 0) > 0 ? (
                        <span
                          className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full"
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 10,
                            fontWeight: 600,
                            backgroundColor: C.gold,
                            color: C.bg,
                          }}
                        >
                          {(item.badge ?? 0) >= 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none">
                <Avatar
                  className="h-8 w-8"
                  style={{ border: `1px solid ${C.border}` }}
                >
                  <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.fullName || 'User'} />
                  <AvatarFallback
                    style={{
                      background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
                      color: C.bg,
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      fontWeight: 400,
                    }}
                  >
                    {clerkUser?.firstName?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="hidden md:inline"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.text,
                  }}
                >
                  {convexUser?.username || clerkUser?.username || 'User'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
              }}
            >
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 cursor-pointer"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: C.text,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.text; }}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/friends"
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: C.text,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.text; }}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Friends</span>
                  </span>
                  {pendingFriendRequests > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        fontWeight: 600,
                        backgroundColor: C.gold,
                        color: C.bg,
                      }}
                    >
                      {pendingFriendRequests >= 99 ? '99+' : pendingFriendRequests}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 cursor-pointer"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: C.text,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.text; }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ backgroundColor: C.border }} />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 cursor-pointer"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: C.textMuted,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: C.surface,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const badge = item.badge ?? 0;

            return (
              <Link
                key={item.path}
                href={item.path}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
                style={{ color: active ? C.gold : C.textMuted }}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        fontWeight: 600,
                        backgroundColor: C.gold,
                        color: C.bg,
                      }}
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
