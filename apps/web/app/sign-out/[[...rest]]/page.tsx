"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Sign-out page that handles the Clerk sign-out flow
 */
export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut();
        router.push("/");
      } catch (error) {
        console.error("Error signing out:", error);
      }
    };

    handleSignOut();
  }, [signOut, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 px-4 py-16 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[2.25rem] border border-white/10 bg-stone-950/80 p-12 shadow-[0_40px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-sky-500/30">
          <svg
            className="h-8 w-8 text-blue-100"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">Signing you out...</h1>
          <p className="text-sm text-stone-400">
            You're being signed out of your Binnacle account.
          </p>
        </div>

        <div className="flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-blue-400/20 border-t-blue-400" />

        <Link
          href="/"
          className="text-sm text-blue-300 hover:text-blue-200 transition"
        >
          Return to home
        </Link>
      </div>
    </main>
  );
}
