"use client";

import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";

const features = [
  {
    title: "Build your backlog",
    description:
      "Collect every game you want to play and keep them organized in one shared space.",
  },
  {
    title: "Capture rich reviews",
    description:
      "Log impressions, screenshots, and Convex-powered notes you can revisit anytime.",
  },
  {
    title: "Stay in sync with friends",
    description:
      "Follow friends, see what they are playing, and cheer each other on in real-time.",
  },
];

/**
 * Custom user button dropdown matching the sign-in/sign-up design system.
 */
function CustomUserButton() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-stone-900/60 text-sm font-semibold text-white transition hover:border-blue-400/70"
      >
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.fullName || "User"}
            width={36}
            height={36}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span>{user.firstName?.[0] || user.emailAddresses[0].emailAddress[0].toUpperCase()}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-stone-900 shadow-[0_20px_40px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                  {user.firstName?.[0] || user.emailAddresses[0].emailAddress[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-white">
                  {user.fullName || user.username || "User"}
                </span>
                <span className="truncate text-xs text-stone-400">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Link
                href="/app"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800/80 hover:text-white"
              >
                <svg className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Open app
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ redirectUrl: "/" });
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800/80 hover:text-white"
              >
                <svg className="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-16 px-4 py-10 sm:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Binnacle
          </Link>
          <div className="flex items-center gap-3">
            <SignedOut>
              <div className="flex items-center gap-3">
                <Link
                  href="/sign-in"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
                >
                  Get started
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3">
                <Link
                  href="/app"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
                >
                  Open the app
                </Link>
                <CustomUserButton />
              </div>
            </SignedIn>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 text-center sm:text-left">
          <div className="flex flex-col gap-4">
            <span className="text-sm uppercase tracking-[0.3em] text-blue-300/70">
              Binnacle · Backlog Companion
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your backlog, beautifully organized and ready for every session.
            </h1>
            <p className="text-base text-stone-300 sm:text-lg">
              Sign in with Clerk to sync progress across the web and mobile apps, jot down reviews, and follow what your crew is playing.
            </p>
          </div>

          <SignedOut>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Link
                href="/sign-up"
                className="rounded-full bg-blue-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-400"
              >
                Create your account
              </Link>
              <Link
                href="/sign-in"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
              >
                Already have one? Sign in
              </Link>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Link
                href="/app"
                className="rounded-full bg-blue-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-400"
              >
                Continue to your backlog
              </Link>
            </div>
          </SignedIn>
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-stone-900/60 p-6 shadow-[0px_40px_80px_rgba(2,6,23,0.45)] backdrop-blur sm:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="flex flex-col gap-2 text-left">
              <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
              <p className="text-sm text-stone-400">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
