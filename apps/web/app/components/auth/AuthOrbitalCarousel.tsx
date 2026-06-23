"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const ARCHIVE_ITEMS = [
  { title: "Elden Ring", cover: "linear-gradient(135deg, #4A3D2A 0%, #2A2118 50%, #6B5A3D 100%)", status: "Playing" },
  { title: "Celeste", cover: "linear-gradient(135deg, #3D2A4A 0%, #1E1428 50%, #6B4A7D 100%)", status: "Completed" },
  { title: "Hades", cover: "linear-gradient(135deg, #4A2A2A 0%, #281414 50%, #7D4A4A 100%)", status: "Completed" },
  { title: "Hollow Knight", cover: "linear-gradient(135deg, #1E3A3A 0%, #0E2020 50%, #2E5A5A 100%)", status: "Backlog" },
  { title: "Disco Elysium", cover: "linear-gradient(135deg, #3A3A1E 0%, #202010 50%, #5A5A2E 100%)", status: "Backlog" },
  { title: "Outer Wilds", cover: "linear-gradient(135deg, #1E2E4A 0%, #0E1828 50%, #2E4A7D 100%)", status: "Wishlist" },
  { title: "NieR: Automata", cover: "linear-gradient(135deg, #3A3530 0%, #201E1A 50%, #5A5550 100%)", status: "Completed" },
];

export function AuthOrbitalCarousel({ coverUrls }: { coverUrls?: Record<string, string> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = ARCHIVE_ITEMS.length;

  const COLORS = {
    border: "rgba(96,165,250,0.16)",
    borderStrong: "rgba(96,165,250,0.6)",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
    activeDot: "#60a5fa",
  };

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    if (!paused) {
      intervalRef.current = setInterval(advance, 3200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, advance]);

  const statusColor = (status: string) => {
    if (status === "Playing") return "#22d3ee";
    if (status === "Completed") return "#34d399";
    if (status === "Wishlist") return "#a78bfa";
    return "#60a5fa";
  };

  return (
    <div
      className="relative mx-auto h-[320px] w-full max-w-[900px] scale-[0.56] sm:scale-[0.62] md:h-[640px] md:scale-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 700,
          height: 700,
          border: `1px solid ${COLORS.border}`,
          opacity: 0.25,
        }}
      />
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 540,
          height: 540,
          border: `1px solid ${COLORS.border}`,
          opacity: 0.1,
        }}
      />
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 288,
          height: 288,
          background: "radial-gradient(ellipse 70.71% 70.71% at 50% 50%, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0) 70%)",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2"
        style={{ width: 700, height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.2) 50%, transparent 100%)" }}
      />
      <div
        className="absolute left-1/2 top-[45%] -translate-y-1/2"
        style={{ width: 1, height: 700, background: "linear-gradient(180deg, transparent 0%, rgba(96,165,250,0.2) 50%, transparent 100%)", marginLeft: -0.5 }}
      />

      {ARCHIVE_ITEMS.map((item, i) => {
        const offset = ((i - activeIndex + count) % count) - Math.floor(count / 2);
        const isActive = i === activeIndex;
        const angle = (offset / count) * 360;
        const radians = (angle * Math.PI) / 180;
        const rx = 320;
        const ry = 190;
        const x = Math.sin(radians) * rx;
        const y = -Math.cos(radians) * ry * 0.55;
        const depth = Math.cos(radians);
        const scale = isActive ? 1.35 : 0.45 + Math.max(0, depth) * 0.25;
        const opacity = isActive ? 1 : 0.15 + Math.max(0, depth) * 0.4;
        const blur = isActive ? 0 : Math.max(0, (1 - depth) * 5);
        const zIndex = isActive ? 20 : Math.round((depth + 1) * 5);
        const baseWidth = isActive ? 208 : depth > 0.4 ? 112 : 64;
        const baseHeight = isActive ? 288 : depth > 0.4 ? 152 : 96;

        return (
          <button
            key={item.title}
            type="button"
            className="absolute left-1/2 top-[45%] cursor-pointer border-0 bg-transparent p-0"
            style={{
              width: baseWidth,
              height: baseHeight,
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
              opacity,
              filter: blur > 0 ? `blur(${blur}px)` : "none",
              zIndex,
              transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            onClick={() => setActiveIndex(i)}
            aria-label={`Select ${item.title}`}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[6px]"
              style={{
                background: item.cover,
                boxShadow: isActive
                  ? "0 0 40px rgba(96,165,250,0.12), 0 8px 32px rgba(0,0,0,0.6)"
                  : "0 4px 12px rgba(0,0,0,0.4)",
                border: isActive ? `1px solid ${COLORS.borderStrong}` : `1px solid ${COLORS.border}`,
              }}
            >
              {coverUrls?.[item.title] && (
                <Image
                  src={coverUrls[item.title]}
                  alt={item.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
              )}
              <div className="absolute inset-x-0 bottom-0 p-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.72))" }}>
                <div
                  className="truncate text-left"
                  style={{
                    fontSize: isActive ? 14 : 7,
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    color: COLORS.text,
                    letterSpacing: "0.045em",
                    opacity: 0.95,
                  }}
                >
                  {item.title}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      <div
        className="absolute left-1/2 -translate-x-1/2 text-center"
        style={{ bottom: 58, transition: "opacity 0.5s" }}
      >
        <div
          className="mb-1"
          style={{
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: 14,
            color: COLORS.text,
            letterSpacing: "0.08em",
            fontWeight: 400,
          }}
        >
          {ARCHIVE_ITEMS[activeIndex].title}
        </div>
        <div
          className="inline-flex items-center gap-2"
          style={{
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: 11,
            color: statusColor(ARCHIVE_ITEMS[activeIndex].status),
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusColor(ARCHIVE_ITEMS[activeIndex].status) }}
          />
          {ARCHIVE_ITEMS[activeIndex].status}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
        {ARCHIVE_ITEMS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              backgroundColor: i === activeIndex ? COLORS.activeDot : COLORS.border,
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label={`Go to item ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
