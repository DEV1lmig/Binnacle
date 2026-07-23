"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { C, FONT_MONO } from "@/app/lib/design-system";

type SpoilerGateProps = {
  children: React.ReactNode;
};

export function SpoilerGate({ children }: SpoilerGateProps) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-sm overflow-hidden">
      <div aria-hidden className="pointer-events-none select-none" style={{ filter: "blur(10px)" }}>
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4"
        style={{ backgroundColor: "rgba(11, 14, 20, 0.75)" }}
      >
        <TriangleAlert className="w-6 h-6" style={{ color: C.amber }} />
        <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Contains spoilers
        </p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="px-4 py-2 transition-colors"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: C.bg,
            backgroundColor: C.gold,
            borderRadius: 2,
          }}
        >
          Show anyway
        </button>
      </div>
    </div>
  );
}
