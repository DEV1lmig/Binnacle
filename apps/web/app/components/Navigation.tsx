"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Home, Search, Library, User, Settings, LogOut, Users, Bell, BookOpen, ChevronDown, PenLine, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { useCurrentUser } from '@/app/context/CurrentUserContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { currentUser } = useCurrentUser();
  const { signOut } = useClerk();
  const incoming = useQuery(api.friends.listIncomingRequests, currentUser ? { limit: 99 } : 'skip');
  const unread = useQuery(api.notifications.getUnreadCount, currentUser ? {} : 'skip');
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const items = [
    { path: '/feed', label: 'Home', icon: Home },
    { path: '/backlog', label: 'My library', icon: Library },
    { path: '/discover', label: 'Discover', icon: Search },
    { path: '/articles', label: 'Stories', icon: BookOpen },
    { path: '/friends', label: 'Friends', icon: Users, badge: incoming?.length },
  ];
  const mobileItems = [items[0], items[1], items[2], { path: '/notifications', label: 'Activity', icon: Bell, badge: unread?.count }, { path: '/profile', label: 'Profile', icon: User }];
  return <>
    <a className="pc-skip" href="#playchive-content">Skip to content</a>
    <header className="pc-nav">
      <div className="pc-nav-inner">
        <Link href={isSignedIn ? '/feed' : '/'} aria-label="Playchive home">
          <Image className="pc-logo" src="/brand/playchive-logo-dark.svg" alt="Playchive" width={155} height={42} priority />
        </Link>
        {isSignedIn ? <>
          <nav className="pc-nav-links" aria-label="Main navigation">
            {items.map(item => <Link key={item.path} className="pc-nav-link" href={item.path} aria-current={active(item.path) ? 'page' : undefined}>
              {item.label}{!!item.badge && <span className="pc-count">{item.badge > 99 ? '99+' : item.badge}</span>}
            </Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="pk-pill pc-write" data-tone="gold" data-size="sm" aria-label="Create"><Plus size={16} /><span>Create</span></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <DropdownMenuItem asChild className="rounded-lg p-3"><Link href="/review/new"><PenLine size={16} />Write a review</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg p-3"><Link href="/article/new"><BookOpen size={16} />Tell a story</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg p-3"><Link href="/discover"><Search size={16} />Add a game to my library</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link className="pc-nav-link" href="/notifications" aria-label={`Notifications${unread?.count ? `, ${unread.count} unread` : ''}`} aria-current={active('/notifications') ? 'page' : undefined}>
              <Bell size={19} />{!!unread?.count && <span className="pc-count">{unread.count > 99 ? '99+' : unread.count}</span>}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="pc-profile-trigger" aria-label="Open account menu">
                  <Avatar className="h-9 w-9 rounded-xl">
                    <AvatarImage src={user?.imageUrl} alt="" />
                    <AvatarFallback className="bg-primary text-white">{user?.firstName?.charAt(0) ?? 'P'}</AvatarFallback>
                  </Avatar>
                  <span className="pc-profile-name text-sm font-semibold max-w-28 truncate">{currentUser?.username || user?.username || 'My account'}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                {[{ path: '/profile', label: 'My profile', icon: User }, { path: '/friends', label: 'Friends', icon: Users }, { path: '/articles', label: 'Stories', icon: BookOpen }, { path: '/settings', label: 'Settings', icon: Settings }].map(item => <DropdownMenuItem asChild key={item.path} className="rounded-lg p-3"><Link href={item.path}><item.icon size={16} />{item.label}</Link></DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg p-3" onClick={async () => { await signOut(); router.push('/'); }}><LogOut size={16} />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </> : <div className="ml-auto flex gap-3"><Link href="/sign-in" className="pc-nav-link">Sign in</Link><Link href="/sign-up" className="pc-primary">Join Playchive</Link></div>}
      </div>
    </header>
    {isSignedIn && <nav className="pc-mobile-nav" aria-label="Mobile navigation">{mobileItems.map(item => <Link key={item.path} href={item.path} aria-current={active(item.path) ? 'page' : undefined}><item.icon size={21} /><span>{item.label}</span>{!!item.badge && <span className="pc-count">{item.badge > 9 ? '9+' : item.badge}</span>}</Link>)}</nav>}
    <div id="playchive-content" tabIndex={-1} />
  </>;
}
