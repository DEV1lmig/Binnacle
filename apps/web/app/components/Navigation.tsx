"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Clipboard, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useUser } from '@clerk/nextjs';
import { useCurrentUser } from '@/app/context/CurrentUserContext';

export function Navigation() {
  const pathname = usePathname();
  const { user: clerkUser } = useUser();
  const { currentUser: convexUser } = useCurrentUser();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`);

  const mobileNavItems = [
    { path: '/feed', icon: Home, label: 'Home' },
    { path: '/discover', icon: Search, label: 'Discover' },
    { path: '/backlog', icon: Clipboard, label: 'Backlog' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

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

          <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
          </Link>
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
