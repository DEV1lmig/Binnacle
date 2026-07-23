"use client";

import { useMemo } from "react";
import { Input } from "@/app/components/ui/input";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { C, FONT_MONO } from "@/app/lib/design-system";

type ArticleCoverFieldProps = {
  value: string;
  onChange: (value: string) => void;
  fallbackCoverUrl?: string;
};

export function ArticleCoverField({ value, onChange, fallbackCoverUrl }: ArticleCoverFieldProps) {
  const trimmed = value.trim();

  const error = useMemo(() => {
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        return "Cover URL must use https";
      }
      return null;
    } catch {
      return "Enter a valid URL";
    }
  }, [trimmed]);

  const previewUrl = !error && trimmed ? trimmed : fallbackCoverUrl;

  return (
    <div className="space-y-2">
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Cover image (optional)
      </p>
      <div className="flex gap-3 items-start">
        <div
          className="w-20 h-28 rounded-sm overflow-hidden flex-shrink-0"
          style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.border}` }}
        >
          {previewUrl ? (
            <ImageWithFallback src={previewUrl} alt="Cover preview" className="w-full h-full object-cover" unoptimized />
          ) : null}
        </div>
        <div className="flex-1 space-y-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, borderRadius: 2 }}
          />
          {error ? (
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.red }}>{error}</p>
          ) : !trimmed && fallbackCoverUrl ? (
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
              Falls back to the first linked game&apos;s cover.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
