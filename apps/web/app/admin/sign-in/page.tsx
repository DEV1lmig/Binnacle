"use client";

import { SignIn } from "@clerk/nextjs";
import { C, FONT_HEADING, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

export default function AdminSignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: C.bg }}
    >
      <style>{`@import url('${FONT_IMPORT_URL}');`}</style>
      <GrainOverlay id="admin-signin-grain" />

      {/* Ambient orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: 400,
          height: 400,
          top: -100,
          left: -100,
          background: `radial-gradient(circle, ${C.gold}15 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          width: 350,
          height: 350,
          bottom: -80,
          right: -80,
          background: `radial-gradient(circle, ${C.accent}12 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div className="w-full max-w-md">
        <div
          className="relative"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.surface,
            padding: 24,
          }}
        >
          <CornerMarkers size={10} />

          {/* Scan line */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${C.gold}44, transparent)`,
            }}
          />

          <div style={{ marginBottom: 16 }}>
            <h1
              style={{
                fontFamily: FONT_HEADING,
                fontSize: 22,
                fontWeight: 200,
                color: C.text,
                letterSpacing: "-0.01em",
                marginBottom: 4,
              }}
            >
              Admin Sign In
            </h1>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 300,
                color: C.textMuted,
              }}
            >
              Sign in to access the moderation dashboard.
            </p>
          </div>
          <SignIn routing="path" path="/admin/sign-in" forceRedirectUrl="/admin" />
        </div>
      </div>
    </div>
  );
}
