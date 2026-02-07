"use client";

import { C, FONT_MONO } from "@/app/lib/design-system";

// ---------------------------------------------------------------------------
// Corner Markers
// ---------------------------------------------------------------------------

export function CornerMarkers({ size = 12, color = C.borderLight }: { size?: number; color?: string }) {
  const s = `${size}px`;
  const base = { position: "absolute" as const, width: s, height: s };
  const border = `1px solid ${color}`;
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderTop: border, borderLeft: border }} />
      <span style={{ ...base, top: 0, right: 0, borderTop: border, borderRight: border }} />
      <span style={{ ...base, bottom: 0, left: 0, borderBottom: border, borderLeft: border }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: border, borderRight: border }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Grain Overlay
// ---------------------------------------------------------------------------

export function GrainOverlay({ id = "grain" }: { id?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        opacity: 0.025,
      }}
    >
      <svg width="100%" height="100%">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dot Grid
// ---------------------------------------------------------------------------

export function DotGrid({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// HUD Badge  (e.g., section labels like "ARCHIVE TELEMETRY")
// ---------------------------------------------------------------------------

export function HudBadge({ children, color = C.cyan }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        border: `1px solid ${color}33`,
        borderRadius: 2,
        fontFamily: FONT_MONO,
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, opacity: 0.7 }} />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HUD Divider (thin gradient line)
// ---------------------------------------------------------------------------

export function HudDivider() {
  return (
    <div
      style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
      }}
    />
  );
}
