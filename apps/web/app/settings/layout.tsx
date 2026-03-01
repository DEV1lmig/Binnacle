import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { SettingsNav } from "./SettingsNav";
import { C, FONT_HEADING, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { GrainOverlay, HudBadge, HudDivider } from "@/app/lib/design-primitives";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: C.bg }}>
      <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
      <GrainOverlay id="settings-grain" />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed" style={{ top: -100, left: -100, width: 380, height: 380, background: `radial-gradient(circle, ${C.gold}10 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="pointer-events-none fixed" style={{ bottom: -100, right: -100, width: 380, height: 380, background: `radial-gradient(circle, ${C.accent}08 0%, transparent 70%)`, filter: "blur(60px)" }} />

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="w-6 h-6" style={{ color: C.gold }} />
            <HudBadge color={C.gold}>Configuration</HudBadge>
          </div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 32, fontWeight: 200, color: C.text, letterSpacing: "-0.01em" }}>
            Settings
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted, marginTop: 4 }}>
            Manage your account settings and preferences
          </p>
        </div>

        <HudDivider />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="md:col-span-1">
            <SettingsNav />
          </div>
          <div className="md:col-span-3 flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
