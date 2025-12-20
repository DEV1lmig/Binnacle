"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication.
 * Shows a loading state while auth is being resolved to prevent flash of content.
 * Redirects unauthenticated users to sign-in for protected routes.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/discover",
    "/game",
    "/profile",
    "/review",
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(route);
  });

  useEffect(() => {
    // Only process after Clerk auth state is loaded
    if (!isLoaded) {
      return;
    }

    // If user is on a protected route and not signed in, redirect to sign-in
    if (!isPublicRoute && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    // If user is signed in and on landing page, redirect to feed
    if (isSignedIn && pathname === "/") {
      router.push("/feed");
      return;
    }
  }, [isLoaded, isSignedIn, isPublicRoute, pathname, router]);

  // Show loading skeleton while auth state is being determined
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bkl-color-bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bkl-color-accent-primary)]" />
          <p className="text-sm text-[var(--bkl-color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If on a protected route without auth, show loading while redirecting
  if (!isPublicRoute && !isSignedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bkl-color-bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bkl-color-accent-primary)]" />
          <p className="text-sm text-[var(--bkl-color-text-secondary)]">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // If signed in on landing page, show loading while redirecting
  if (isSignedIn && pathname === "/") {
    return null; // Let the landing page handle its own redirect
  }

  // Auth is resolved, render children
  return <>{children}</>;
}
