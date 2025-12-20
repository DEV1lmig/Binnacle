"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Home, Search, Clipboard, User as UserIcon, Settings, LogOut, Users } from 'lucide-react';
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

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { currentUser: convexUser } = useCurrentUser();
  const { signOut } = useClerk();

  // Avoid querying Convex until the user record is available (prevents "User profile not found" during initial sync).
  const incomingRequests = useQuery(
    api.friends.listIncomingRequests,
    convexUser ? { limit: 99 } : "skip",
  );
  const pendingFriendRequests = incomingRequests?.length ?? 0;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`);

  const mobileNavItems = [
    { path: '/feed', icon: Home, label: 'Home' },
    { path: '/discover', icon: Search, label: 'Discover' },
    { path: '/backlog', icon: Clipboard, label: 'Backlog' },
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

  // Logged-out navigation state
  if (!isSignedIn) {
    return (
      <nav className="border-b border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] px-4 py-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors"
            style={{ fontSize: 'var(--bkl-font-size-xl)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
          >
            Binnacle
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 rounded-lg border border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] hover:border-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-primary)] transition-all"
              style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg bg-[var(--bkl-color-accent-primary)] text-white hover:bg-[var(--bkl-color-accent-hover)] transition-all"
              style={{ 
                fontSize: 'var(--bkl-font-size-sm)', 
                fontWeight: 'var(--bkl-font-weight-medium)',
                boxShadow: '0 0 20px rgba(102, 192, 244, 0.3)'
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Logged-in navigation state (existing)
  return (
    <>
      <nav className="border-b border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] px-4 py-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 md:gap-8">
            <Link
              href="/feed"
              className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)] transition-colors"
              style={{ fontSize: 'var(--bkl-font-size-xl)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
            >
              Binnacle
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/feed"
                className={`transition-colors ${
                  isActive('/feed')
                    ? 'text-[var(--bkl-color-accent-primary)]'
                    : 'text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]'
                }`}
                style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
              >
                Feed
              </Link>
              <Link
                href="/friends"
                className={`transition-colors ${
                  isActive('/friends')
                    ? 'text-[var(--bkl-color-accent-primary)]'
                    : 'text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]'
                }`}
                style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
              >
                <span className="inline-flex items-center gap-2">
                  Friends
                  {pendingFriendRequests > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                      style={{ fontSize: 'var(--bkl-font-size-xs)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
                    >
                      {pendingFriendRequests >= 99 ? '99+' : pendingFriendRequests}
                    </span>
                  ) : null}
                </span>
              </Link>
              <Link
                href="/backlog"
                className={`transition-colors ${
                  isActive('/backlog')
                    ? 'text-[var(--bkl-color-accent-primary)]'
                    : 'text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]'
                }`}
                style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
              >
                Backlog
              </Link>
              <Link
                href="/discover"
                className={`transition-colors ${
                  isActive('/discover')
                    ? 'text-[var(--bkl-color-accent-primary)]'
                    : 'text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]'
                }`}
                style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
              >
                Discover
              </Link>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none">
                <Avatar className="h-8 w-8 border border-[var(--bkl-color-border)]">
                  <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.fullName || 'User'} />
                  <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                    {clerkUser?.firstName?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="hidden md:inline text-[var(--bkl-color-text-primary)]"
                  style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-medium)' }}
                >
                  {convexUser?.username || clerkUser?.username || 'User'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]"
            >
              <DropdownMenuItem asChild>
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 cursor-pointer text-[var(--bkl-color-text-primary)] hover:text-[var(--bkl-color-accent-primary)]"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/friends"
                  className="flex items-center justify-between gap-2 cursor-pointer text-[var(--bkl-color-text-primary)] hover:text-[var(--bkl-color-accent-primary)]"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Friends</span>
                  </span>
                  {pendingFriendRequests > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                      style={{ fontSize: 'var(--bkl-font-size-xs)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
                    >
                      {pendingFriendRequests >= 99 ? '99+' : pendingFriendRequests}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  href="/settings" 
                  className="flex items-center gap-2 cursor-pointer text-[var(--bkl-color-text-primary)] hover:text-[var(--bkl-color-accent-primary)]"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--bkl-color-border)]" />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="flex items-center gap-2 cursor-pointer text-[var(--bkl-color-text-secondary)] hover:text-red-500"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Bottom navigation matches mobile design */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bkl-color-bg-secondary)] border-t border-[var(--bkl-color-border)] z-50">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  active
                    ? 'text-[var(--bkl-color-accent-primary)]'
                    : 'text-[var(--bkl-color-text-secondary)]'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontSize: 'var(--bkl-font-size-xs)', fontWeight: 'var(--bkl-font-weight-medium)' }}>
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
