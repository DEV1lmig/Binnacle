import { ShieldAlert } from "lucide-react";
import { C, FONT_HEADING, FONT_BODY, FONT_MONO, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";
import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: C.bg }}
    >
      <style>{`@import url('${FONT_IMPORT_URL}');`}</style>
      <GrainOverlay id="not-auth-grain" />

      {/* Ambient orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: 400,
          height: 400,
          top: -100,
          left: -100,
          background: `radial-gradient(circle, ${C.red}12 0%, transparent 70%)`,
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
          background: `radial-gradient(circle, ${C.accent}10 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative max-w-md w-full mx-4 text-center"
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          background: C.surface,
          padding: "40px 32px",
        }}
      >
        <CornerMarkers size={10} />

        {/* Scan line */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${C.red}44, transparent)`,
          }}
        />

        <ShieldAlert
          style={{
            width: 48,
            height: 48,
            color: C.red,
            margin: "0 auto 20px",
          }}
        />

        <h1
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 22,
            fontWeight: 200,
            color: C.text,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          Restricted Area
        </h1>

        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            marginBottom: 6,
          }}
        >
          Hey &mdash; you don&apos;t have to be here. Shoo.
        </p>

        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.textDim,
            marginBottom: 28,
          }}
        >
          This area is restricted to admins
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            border: "none",
            borderRadius: 2,
            background: C.gold,
            color: C.bg,
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 500,
            padding: "8px 24px",
            textDecoration: "none",
            boxShadow: `0 0 16px ${C.bloom}`,
            transition: "opacity 0.2s, box-shadow 0.2s",
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
