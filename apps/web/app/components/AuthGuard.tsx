"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { C, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/discover",
    "/game",
    "/profile",
    "/review",
    "/landingpage",
  ];

  const isPublicRoute = publicRoutes.some(route => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(route);
  });

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isPublicRoute && !isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (isSignedIn && pathname === "/") {
      router.push("/feed");
      return;
    }
  }, [isLoaded, isSignedIn, isPublicRoute, pathname, router]);

  if (!isLoaded) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: C.bg }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.gold }} />
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.1em", color: C.textMuted }}>
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && !isSignedIn) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: C.bg }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.gold }} />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted }}>
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  if (isSignedIn && pathname === "/") {
    return null;
  }

  return <>{children}</>;
}
