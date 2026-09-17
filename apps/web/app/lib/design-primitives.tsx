"use client";
import { C } from '@/app/lib/design-system';

// Kept as compatibility exports while removing the old HUD ornamentation.
export function CornerMarkers(_props: { size?: number; color?: string }) { void _props; return null; }
export function GrainOverlay(_props: { id?: string }) { void _props; return null; }
export function DotGrid(_props: { opacity?: number }) { void _props; return null; }
export function HudBadge({ children, color = C.cyan }: { children: React.ReactNode; color?: string }) {
  return <span className="pc-section-label" style={{ color }}>{children}</span>;
}
export function HudDivider() { return <div className="h-px bg-border" />; }
