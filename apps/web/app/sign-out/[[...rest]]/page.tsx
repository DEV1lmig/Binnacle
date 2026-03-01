"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-16" style={{ background: C.bg }}>
      <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
      <GrainOverlay id="signout-grain" />

      {/* Ambient orb */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: "30%", left: "40%", width: 300, height: 300,
          background: `radial-gradient(circle, ${C.gold}12 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative flex w-full max-w-md flex-col items-center gap-6 p-12"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
        }}
      >
        <CornerMarkers size={12} />

        <div
          className="flex items-center justify-center"
          style={{
            width: 56, height: 56,
            borderRadius: 2,
            background: `${C.gold}15`,
            border: `1px solid ${C.gold}33`,
          }}
        >
          <LogOut style={{ width: 24, height: 24, color: C.gold }} />
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 200, color: C.text }}>
            Signing you out...
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted }}>
            You&apos;re being signed out of your Binnacle account.
          </p>
        </div>

        {/* Spinner */}
        <div
          className="animate-spin"
          style={{
            width: 32, height: 32,
            borderRadius: "50%",
            border: `2px solid ${C.border}`,
            borderTopColor: C.gold,
          }}
        />

        <Link
          href="/"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            color: C.gold,
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.cyan; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.gold; }}
        >
          RETURN TO HOME
        </Link>
      </div>
    </main>
  );
}
