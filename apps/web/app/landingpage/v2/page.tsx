"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, Star } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getStandardCoverUrl } from "@/lib/igdb-images";

// ─── Palette ───────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  bgAlt: "#111620",
  surface: "#161B26",
  border: "#1E2636",
  borderLight: "#2A3448",
  text: "#E2E8F0",
  textMuted: "#8494A7",
  textDim: "#4A5568",
  gold: "#60A5FA",
  goldDim: "#3B82F6",
  cyan: "#22D3EE",
  cyanDim: "#06B6D4",
  bloom: "rgba(96, 165, 250, 0.08)",
  bloomCyan: "rgba(34, 211, 238, 0.06)",
  accent: "#A78BFA",
  accentDim: "#7C3AED",
  green: "#34D399",
  amber: "#FBBF24",
} as const;

// ─── Game covers for the orbital carousel ──────────────────
const ARCHIVE_ITEMS = [
  { title: "Elden Ring", cover: "linear-gradient(135deg, #4A3D2A 0%, #2A2118 50%, #6B5A3D 100%)", status: "Playing" },
  { title: "Celeste", cover: "linear-gradient(135deg, #3D2A4A 0%, #1E1428 50%, #6B4A7D 100%)", status: "Completed" },
  { title: "Hades", cover: "linear-gradient(135deg, #4A2A2A 0%, #281414 50%, #7D4A4A 100%)", status: "Completed" },
  { title: "Hollow Knight", cover: "linear-gradient(135deg, #1E3A3A 0%, #0E2020 50%, #2E5A5A 100%)", status: "Backlog" },
  { title: "Disco Elysium", cover: "linear-gradient(135deg, #3A3A1E 0%, #202010 50%, #5A5A2E 100%)", status: "Backlog" },
  { title: "Outer Wilds", cover: "linear-gradient(135deg, #1E2E4A 0%, #0E1828 50%, #2E4A7D 100%)", status: "Wishlist" },
  { title: "NieR: Automata", cover: "linear-gradient(135deg, #3A3530 0%, #201E1A 50%, #5A5550 100%)", status: "Completed" },
];

const FEATURES = [
  {
    title: "Track Everything",
    desc: "Every title finds its place. Playing, completed, backlog, wishlist -- your entire history, preserved and organized.",
    detail: "Custom lists, tags, and filters",
    icon: "archive",
  },
  {
    title: "Write What Matters",
    desc: "Your reviews become part of the record. Rate, reflect, recommend. Every word contributes to the archive.",
    detail: "Rich text, spoiler tags, ratings",
    icon: "pen",
  },
  {
    title: "Find Your People",
    desc: "Follow curators you trust. Surface games through voices that understand your taste, not algorithms.",
    detail: "Feed, follows, and recommendations",
    icon: "signal",
  },
  {
    title: "Smart Discovery",
    desc: "Browse by genre, mood, playtime, or rating. Discover hidden gems surfaced by the community, not marketing.",
    detail: "142 genres, community-driven",
    icon: "discover",
  },
  {
    title: "Progress Tracking",
    desc: "Log playtime, completion percentage, and achievements. Watch your gaming journey unfold over time.",
    detail: "Stats, streaks, and milestones",
    icon: "progress",
  },
  {
    title: "Privacy First",
    desc: "Your data stays yours. Choose what to share and what to keep private. No ads, no tracking, no selling your data.",
    detail: "Granular privacy controls",
    icon: "shield",
  },
];

const STATS = [
  { value: 10847, label: "Titles Archived", suffix: "" },
  { value: 5231, label: "Active Archivists", suffix: "" },
  { value: 52094, label: "Records Written", suffix: "" },
  { value: 142, label: "Genres Indexed", suffix: "" },
];

const REVIEWS = [
  {
    quote: "I stopped losing games in my backlog. Everything is here, organized, mine. The tagging system alone changed how I think about my collection.",
    reviewer: "Maren T.",
    context: "Archivist since 2024",
    game: "Elden Ring",
    rating: 5,
    gradient: "linear-gradient(135deg, #4A3D2A, #2A2118)",
  },
  {
    quote: "Writing my review of Hades here felt like closing a chapter. The platform respects the weight of that. It's not just a rating -- it's a reflection.",
    reviewer: "Julian K.",
    context: "247 records",
    game: "Hades",
    rating: 5,
    gradient: "linear-gradient(135deg, #4A2A2A, #281414)",
  },
  {
    quote: "Found three people who actually understand niche JRPGs. That alone was worth it. The feed shows me exactly what I want to see.",
    reviewer: "Sable R.",
    context: "Following 12 curators",
    game: "Persona 5",
    rating: 4,
    gradient: "linear-gradient(135deg, #4A2A3A, #281428)",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create your archive", desc: "Sign up in seconds. Import from Steam, PlayStation, or start fresh." },
  { step: "02", title: "Organize your collection", desc: "Tag, categorize, and prioritize. Your backlog, your way." },
  { step: "03", title: "Write and share", desc: "Review games, follow curators, and discover what to play next." },
];

// ─── Thin geometric SVG icons ──────────────────────────────
function GeoIcon({ type, size = 32 }: { type: string; size?: number }) {
  const stroke = C.cyan;
  const sw = 1.2;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {type === "archive" && (
        <>
          <rect x="4" y="4" width="20" height="20" rx="1" stroke={stroke} strokeWidth={sw} />
          <line x1="4" y1="10" x2="24" y2="10" stroke={stroke} strokeWidth={sw} />
          <line x1="10" y1="10" x2="10" y2="24" stroke={stroke} strokeWidth={sw} />
          <circle cx="17" cy="17" r="3" stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {type === "pen" && (
        <>
          <line x1="6" y1="22" x2="22" y2="6" stroke={stroke} strokeWidth={sw} />
          <polygon points="22,6 18,6 22,10" stroke={stroke} strokeWidth={sw} fill="none" />
          <line x1="6" y1="22" x2="10" y2="22" stroke={stroke} strokeWidth={sw * 0.8} />
          <line x1="6" y1="22" x2="6" y2="18" stroke={stroke} strokeWidth={sw * 0.8} />
          <circle cx="14" cy="14" r="1.5" fill={stroke} />
        </>
      )}
      {type === "signal" && (
        <>
          <circle cx="14" cy="14" r="3" stroke={stroke} strokeWidth={sw} />
          <path d="M8 8 A8.5 8.5 0 0 0 8 20" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M20 8 A8.5 8.5 0 0 1 20 20" stroke={stroke} strokeWidth={sw} fill="none" />
          <path d="M5 5 A12.7 12.7 0 0 0 5 23" stroke={stroke} strokeWidth={sw * 0.7} fill="none" opacity="0.5" />
          <path d="M23 5 A12.7 12.7 0 0 1 23 23" stroke={stroke} strokeWidth={sw * 0.7} fill="none" opacity="0.5" />
        </>
      )}
      {type === "discover" && (
        <>
          <circle cx="14" cy="14" r="9" stroke={stroke} strokeWidth={sw} />
          <circle cx="14" cy="14" r="3" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="5" x2="14" y2="8" stroke={stroke} strokeWidth={sw} />
          <line x1="14" y1="20" x2="14" y2="23" stroke={stroke} strokeWidth={sw} />
          <line x1="5" y1="14" x2="8" y2="14" stroke={stroke} strokeWidth={sw} />
          <line x1="20" y1="14" x2="23" y2="14" stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {type === "progress" && (
        <>
          <rect x="4" y="18" width="4" height="6" rx="0.5" stroke={stroke} strokeWidth={sw} />
          <rect x="12" y="12" width="4" height="12" rx="0.5" stroke={stroke} strokeWidth={sw} />
          <rect x="20" y="6" width="4" height="18" rx="0.5" stroke={stroke} strokeWidth={sw} />
          <line x1="2" y1="26" x2="26" y2="26" stroke={stroke} strokeWidth={sw * 0.6} opacity="0.4" />
        </>
      )}
      {type === "shield" && (
        <>
          <path d="M14 3 L23 7 V15 C23 20 14 25 14 25 C14 25 5 20 5 15 V7 Z" stroke={stroke} strokeWidth={sw} fill="none" />
          <polyline points="10,14 13,17 18,11" stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      )}
    </svg>
  );
}

// ─── Grain overlay ─────────────────────────────────────────
function GrainOverlay() {
  return (
    <svg className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.025]">
      <filter id="archiveGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#archiveGrain)" />
    </svg>
  );
}

// ─── Dot grid background ───────────────────────────────────
function DotGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        opacity: 0.4,
      }}
    />
  );
}

// ─── Thin HUD line divider ─────────────────────────────────
function HudDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto flex w-full max-w-xs items-center justify-center ${className}`}>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />
      <div className="mx-3 h-1 w-1 rotate-45" style={{ backgroundColor: C.cyan, opacity: 0.6 }} />
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />
    </div>
  );
}

// ─── Scroll reveal hook ────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Mouse spotlight hook ──────────────────────────────────
function useMouseSpotlight() {
  const posRef = useRef({ x: 0.5, y: 0.5 });
  const smoothRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const onMove = (e: MouseEvent) => {
      posRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      smoothRef.current = {
        x: lerp(smoothRef.current.x, posRef.current.x, 0.06),
        y: lerp(smoothRef.current.y, posRef.current.y, 0.06),
      };
      setPos({ ...smoothRef.current });
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return pos;
}

// ─── Scroll progress hook ──────────────────────────────────
function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}

// ─── Section color zones ───────────────────────────────────
// Each zone defines the ambient color for that scroll region.
// Colors are interpolated based on scroll progress.
const SECTION_ZONES = [
  { at: 0.0,  color: [96, 165, 250],   opacity: 0.07 },  // blue (hero)
  { at: 0.15, color: [34, 211, 238],    opacity: 0.06 },  // cyan (features)
  { at: 0.35, color: [34, 211, 238],    opacity: 0.05 },  // cyan (how it works)
  { at: 0.50, color: [167, 139, 250],   opacity: 0.07 },  // purple (stats)
  { at: 0.65, color: [251, 191, 36],    opacity: 0.04 },  // warm amber (reviews)
  { at: 0.80, color: [167, 139, 250],   opacity: 0.05 },  // purple (preview)
  { at: 1.0,  color: [96, 165, 250],    opacity: 0.06 },  // blue (CTA)
] as const;

function getAmbientColor(progress: number): { r: number; g: number; b: number; a: number } {
  const zones = SECTION_ZONES;
  if (progress <= zones[0].at) return { r: zones[0].color[0], g: zones[0].color[1], b: zones[0].color[2], a: zones[0].opacity };
  if (progress >= zones[zones.length - 1].at) {
    const last = zones[zones.length - 1];
    return { r: last.color[0], g: last.color[1], b: last.color[2], a: last.opacity };
  }

  for (let i = 0; i < zones.length - 1; i++) {
    if (progress >= zones[i].at && progress <= zones[i + 1].at) {
      const t = (progress - zones[i].at) / (zones[i + 1].at - zones[i].at);
      const smooth = t * t * (3 - 2 * t); // smoothstep
      return {
        r: zones[i].color[0] + (zones[i + 1].color[0] - zones[i].color[0]) * smooth,
        g: zones[i].color[1] + (zones[i + 1].color[1] - zones[i].color[1]) * smooth,
        b: zones[i].color[2] + (zones[i + 1].color[2] - zones[i].color[2]) * smooth,
        a: zones[i].opacity + (zones[i + 1].opacity - zones[i].opacity) * smooth,
      };
    }
  }
  return { r: 96, g: 165, b: 250, a: 0.07 };
}

// ─── Dynamic background component ─────────────────────────
function DynamicBackground() {
  const mouse = useMouseSpotlight();
  const scroll = useScrollProgress();
  const ambient = getAmbientColor(scroll);

  // Parallax offsets — different speeds create depth
  const layer1Y = scroll * -120;  // slow — far
  const layer2Y = scroll * -220;  // medium
  const layer3Y = scroll * -340;  // fast — near

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Layer 1: large slow ambient glow (far) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 900,
          left: "15%",
          top: "20%",
          transform: `translateY(${layer1Y}px)`,
          background: `radial-gradient(circle, rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, ${ambient.a}) 0%, transparent 70%)`,
          transition: "background 1.2s ease",
          willChange: "transform",
        }}
      />

      {/* Layer 2: medium orb, slightly offset color (mid) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          right: "10%",
          top: "40%",
          transform: `translateY(${layer2Y}px)`,
          background: `radial-gradient(circle, rgba(${Math.round(ambient.r * 0.6 + 34 * 0.4)}, ${Math.round(ambient.g * 0.6 + 211 * 0.4)}, ${Math.round(ambient.b * 0.6 + 238 * 0.4)}, ${ambient.a * 0.8}) 0%, transparent 70%)`,
          transition: "background 1.2s ease",
          willChange: "transform",
        }}
      />

      {/* Layer 3: small fast accent orb (near) */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          left: "50%",
          top: "60%",
          transform: `translate(-50%, ${layer3Y}px)`,
          background: `radial-gradient(circle, rgba(167, 139, 250, ${ambient.a * 0.5}) 0%, transparent 70%)`,
          transition: "background 1.2s ease",
          willChange: "transform",
        }}
      />

      {/* Mouse spotlight */}
      <div
        className="absolute"
        style={{
          width: 800,
          height: 800,
          left: `${mouse.x * 100}%`,
          top: `${mouse.y * 100}%`,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(${Math.round(ambient.r)}, ${Math.round(ambient.g)}, ${Math.round(ambient.b)}, 0.06) 0%, rgba(${Math.round(ambient.r)}, ${Math.round(ambient.g)}, ${Math.round(ambient.b)}, 0.02) 40%, transparent 70%)`,
          transition: "background 0.8s ease",
          willChange: "left, top",
        }}
      />

      {/* Subtle horizontal gradient band that shifts with scroll */}
      <div
        className="absolute inset-x-0"
        style={{
          height: "40vh",
          top: `${30 + scroll * 40}%`,
          background: `linear-gradient(180deg, transparent 0%, rgba(${Math.round(ambient.r)}, ${Math.round(ambient.g)}, ${Math.round(ambient.b)}, ${ambient.a * 0.3}) 50%, transparent 100%)`,
          transition: "background 1.2s ease",
          willChange: "top",
        }}
      />
    </div>
  );
}

// ─── Animated counter ──────────────────────────────────────
function AnimatedCounter({ value, visible }: { value: number; visible: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const duration = 1800;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, value]);

  return <>{display.toLocaleString()}</>;
}

// ─── Orbital Carousel ──────────────────────────────────────
function OrbitalCarousel({ coverUrls }: { coverUrls?: Record<string, string> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = ARCHIVE_ITEMS.length;

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

  const statusColor = (s: string) => {
    if (s === "Playing") return C.cyan;
    if (s === "Completed") return C.green;
    if (s === "Wishlist") return C.accent;
    return C.textDim;
  };

  return (
    <div
      className="relative mx-auto"
      style={{ width: "100%", maxWidth: 900, height: 640 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Outer orbit ring */}
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 700,
          height: 700,
          border: `1px solid ${C.border}`,
          opacity: 0.25,
        }}
      />
      {/* Mid orbit ring */}
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 540,
          height: 540,
          border: `1px dashed ${C.border}`,
          opacity: 0.12,
        }}
      />
      {/* Inner glow */}
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle, ${C.bloom} 0%, transparent 70%)`,
          opacity: 0.5,
        }}
      />
      {/* Crosshair lines */}
      <div
        className="absolute left-1/2 top-[45%] -translate-x-1/2"
        style={{ width: 700, height: 1, background: `linear-gradient(90deg, transparent, ${C.border}33, transparent)` }}
      />
      <div
        className="absolute left-1/2 top-[45%] -translate-y-1/2"
        style={{ width: 1, height: 700, background: `linear-gradient(180deg, transparent, ${C.border}33, transparent)`, marginLeft: -0.5 }}
      />

      {/* Covers */}
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

        return (
          <button
            key={item.title}
            type="button"
            className="absolute left-1/2 top-[45%] cursor-pointer border-0 bg-transparent p-0"
            style={{
              width: 150,
              height: 210,
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
              className="relative h-full w-full overflow-hidden rounded-sm"
              style={{
                background: item.cover,
                boxShadow: isActive
                  ? `0 0 40px ${C.bloom}, 0 8px 32px rgba(0,0,0,0.6)`
                  : "0 4px 12px rgba(0,0,0,0.4)",
                border: isActive ? `1px solid ${C.goldDim}` : `1px solid ${C.border}`,
              }}
            >
              {coverUrls?.[item.title] && (
                <Image
                  src={coverUrls[item.title]}
                  alt={item.title}
                  fill
                   sizes="150px"
                  className="object-cover"
                  unoptimized
                />
              )}
              {/* Scan line overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
                  opacity: isActive ? 0.4 : 0.2,
                }}
              />
              {/* Title on cover */}
              <div className="absolute inset-x-0 bottom-0 p-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                <div
                  className="truncate text-left"
                  style={{
                    fontSize: 10,
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    color: C.text,
                    letterSpacing: "0.05em",
                    opacity: 0.9,
                  }}
                >
                  {item.title}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {/* Active item info below carousel */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center"
        style={{ bottom: 20, transition: "opacity 0.5s" }}
      >
        <div
          className="mb-1"
          style={{
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: 14,
            color: C.text,
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
            fontSize: 12,
            color: statusColor(ARCHIVE_ITEMS[activeIndex].status),
            letterSpacing: "0.15em",
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

      {/* Navigation dots */}
      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-1.5">
        {ARCHIVE_ITEMS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              backgroundColor: i === activeIndex ? C.gold : C.border,
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

// ─── Main Page ─────────────────────────────────────────────
export default function LandingPageV2() {
  const heroReveal = useReveal(0.1);
  const featuresReveal = useReveal(0.1);
  const howItWorksReveal = useReveal(0.1);
  const statsReveal = useReveal(0.2);
  const reviewsReveal = useReveal(0.1);
  const ctaReveal = useReveal(0.2);

  const titles = useMemo(() => {
    const set = new Set(ARCHIVE_ITEMS.map((g) => g.title));
    for (const r of REVIEWS) set.add(r.game);
    return Array.from(set);
  }, []);
  const coversData = useQuery(api.games.getCoversByTitles, { titles });

  const coverUrls = useMemo(() => {
    if (!coversData) return undefined;
    const map: Record<string, string> = {};
    for (const entry of coversData) {
      const url = getStandardCoverUrl(entry.coverUrl);
      if (url) map[entry.title] = url;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [coversData]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Outfit:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -20; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .archive-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .archive-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .archive-reveal-delay-1 { transition-delay: 0.1s; }
        .archive-reveal-delay-2 { transition-delay: 0.2s; }
        .archive-reveal-delay-3 { transition-delay: 0.3s; }
        .archive-reveal-delay-4 { transition-delay: 0.4s; }

        .feature-card:hover .feature-glow {
          opacity: 1;
        }
        .feature-card:hover .feature-icon-ring {
          border-color: ${C.cyan}44;
        }
      `}</style>

      <div
        className="min-h-screen"
        style={{
          backgroundColor: C.bg,
          color: C.text,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
        }}
      >
        <GrainOverlay />
        <DynamicBackground />

        {/* ===== NAV + HERO (full viewport) ===== */}
        <div className="relative z-10 flex flex-col" style={{ height: "100dvh", width: "100dvw", maxWidth: "100%" }}>
          {/* ===== NAV ===== */}
          <nav className="flex-shrink-0 flex items-center justify-between px-6 py-5 md:px-12">
            <Link
              href="/"
              className="tracking-widest"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 200,
                fontSize: 20,
                color: C.text,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              Binnacle
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/sign-in"
                className="transition-colors hover:text-white"
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: C.textMuted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="transition-all hover:shadow-lg"
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  backgroundColor: C.gold,
                  color: "#fff",
                  padding: "8px 20px",
                  borderRadius: 2,
                  fontWeight: 400,
                }}
              >
                Begin
              </Link>
            </div>
          </nav>

          {/* ===== HERO ===== */}
          <section className="flex-1 flex items-center px-6 md:px-12">
            <div
              ref={heroReveal.ref}
              className={`archive-reveal ${heroReveal.visible ? "visible" : ""} mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-4`}
            >
              {/* Left column -- text */}
              <div className="flex flex-col items-start text-left">
                {/* HUD label */}
                <div
                  className="archive-reveal-delay-1 mb-8 inline-block"
                  style={{
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: C.cyan,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    padding: "6px 16px",
                    border: `1px solid ${C.cyanDim}33`,
                    borderRadius: 1,
                  }}
                >
                  Backlog Management System v1.0
                </div>

                <h1
                  className="archive-reveal-delay-2 mb-6 text-6xl leading-tight md:text-7xl lg:text-8xl"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 200,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                  }}
                >
                  Play what{" "}
                  <span style={{ color: C.gold, fontWeight: 300 }}>matters</span>
                </h1>

                <p
                  className="archive-reveal-delay-3 mb-6 max-w-md"
                  style={{
                    fontSize: 18,
                    color: C.textMuted,
                    lineHeight: 1.8,
                    fontWeight: 300,
                  }}
                >
                  Your collection, your rules. The archive that finally works -- track
                  every title, write what you feel, find the people who get it.
                </p>

                {/* Trust signals */}
                <div
                  className="archive-reveal-delay-3 mb-10 flex items-center gap-4"
                  style={{
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: C.textDim,
                    letterSpacing: "0.05em",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.green }} />
                    Free forever
                  </span>
                  <span style={{ color: C.border }}>|</span>
                  <span>No credit card</span>
                  <span style={{ color: C.border }}>|</span>
                  <span>5k+ archivists</span>
                </div>

                {/* CTA */}
                <div className="archive-reveal-delay-4 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/sign-up"
                    className="group inline-flex items-center gap-3 transition-all hover:shadow-lg"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 14,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      backgroundColor: C.gold,
                      color: "#fff",
                      padding: "14px 32px",
                      borderRadius: 2,
                      fontWeight: 400,
                      boxShadow: `0 0 30px ${C.bloom}`,
                    }}
                  >
                    Begin Your Archive
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 transition-colors hover:text-white"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 13,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      padding: "14px 24px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                    }}
                  >
                    Explore
                  </Link>
                </div>
              </div>

              {/* Right column -- orbital carousel */}
              <div className="archive-reveal-delay-3 relative flex items-center justify-center">
                <OrbitalCarousel coverUrls={coverUrls} />
              </div>
            </div>
          </section>

          {/* Scroll indicator */}
          <div
            className="flex flex-shrink-0 flex-col items-center gap-2 pb-6"
            style={{ animation: "scrollBounce 2s ease-in-out infinite" }}
          >
            <span
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 10,
                color: C.textDim,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </span>
            <ChevronDown size={16} style={{ color: C.textDim }} />
          </div>
        </div>

        {/* ===== FEATURES ===== */}
        <section className="relative z-10 px-6 py-24 md:px-12 md:py-32">
          <DotGrid />
          <div
            ref={featuresReveal.ref}
            className={`archive-reveal ${featuresReveal.visible ? "visible" : ""} relative z-10 mx-auto max-w-6xl`}
          >
            <div className="mb-20 text-center">
              <div
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: C.textDim,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                System Capabilities
              </div>
              <h2
                className="mb-4 text-4xl md:text-5xl"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 200,
                  letterSpacing: "-0.01em",
                }}
              >
                The backlog that works{" "}
                <span style={{ color: C.gold }}>for you</span>
              </h2>
              <p
                className="mx-auto max-w-lg"
                style={{
                  fontSize: 16,
                  color: C.textMuted,
                  lineHeight: 1.7,
                }}
              >
                Six core systems designed to organize, track, and surface the games that matter most to you.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.title}
                  className={`archive-reveal-delay-${Math.min(i + 1, 4)} feature-card group relative overflow-hidden p-8`}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    background: `linear-gradient(180deg, ${C.surface}66 0%, ${C.bg}88 100%)`,
                    transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.goldDim + "44";
                    e.currentTarget.style.boxShadow = `0 0 40px ${C.bloom}, inset 0 1px 0 ${C.goldDim}22`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Corner markers */}
                  <div className="absolute left-0 top-0 h-4 w-4" style={{ borderTop: `1px solid ${C.goldDim}33`, borderLeft: `1px solid ${C.goldDim}33` }} />
                  <div className="absolute right-0 top-0 h-4 w-4" style={{ borderTop: `1px solid ${C.goldDim}33`, borderRight: `1px solid ${C.goldDim}33` }} />
                  <div className="absolute bottom-0 left-0 h-4 w-4" style={{ borderBottom: `1px solid ${C.goldDim}33`, borderLeft: `1px solid ${C.goldDim}33` }} />
                  <div className="absolute bottom-0 right-0 h-4 w-4" style={{ borderBottom: `1px solid ${C.goldDim}33`, borderRight: `1px solid ${C.goldDim}33` }} />

                  {/* Hover glow */}
                  <div
                    className="feature-glow pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle, ${C.bloom} 0%, transparent 70%)`,
                      opacity: 0,
                    }}
                  />

                  <div className="mb-5 flex items-center gap-4">
                    <div
                      className="feature-icon-ring flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-300"
                      style={{
                        border: `1px solid ${C.border}`,
                        background: `${C.surface}88`,
                      }}
                    >
                      <GeoIcon type={feat.icon} size={24} />
                    </div>
                    <h3
                      className="text-xl"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 300,
                        color: C.text,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {feat.title}
                    </h3>
                  </div>
                  <p
                    className="mb-4 text-base leading-relaxed"
                    style={{
                      color: C.textMuted,
                      lineHeight: 1.7,
                      fontWeight: 300,
                    }}
                  >
                    {feat.desc}
                  </p>
                  <div
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: C.cyan,
                      letterSpacing: "0.08em",
                    }}
                  >
                    <span
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ backgroundColor: C.cyan }}
                    />
                    {feat.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HudDivider className="my-4" />

        {/* ===== HOW IT WORKS ===== */}
        <section className="relative z-10 px-6 py-24 md:px-12 md:py-32">
          <div
            ref={howItWorksReveal.ref}
            className={`archive-reveal ${howItWorksReveal.visible ? "visible" : ""} mx-auto max-w-5xl`}
          >
            <div className="mb-20 text-center">
              <div
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: C.textDim,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Protocol
              </div>
              <h2
                className="text-4xl md:text-5xl"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 200,
                  letterSpacing: "-0.01em",
                }}
              >
                Three steps to{" "}
                <span style={{ color: C.gold }}>clarity</span>
              </h2>
            </div>

            <div className="relative grid gap-8 md:grid-cols-3">
              {/* Connecting line (desktop) */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-[60px] hidden md:block"
                style={{ height: 1 }}
              >
                <svg width="100%" height="2" className="overflow-visible">
                  <line
                    x1="16.5%"
                    y1="1"
                    x2="83.5%"
                    y2="1"
                    stroke={C.border}
                    strokeWidth="1"
                    strokeDasharray="6 4"
                    style={{ animation: "dashMove 2s linear infinite" }}
                  />
                </svg>
              </div>

              {HOW_IT_WORKS.map((item, i) => (
                <div
                  key={item.step}
                  className={`archive-reveal-delay-${i + 1} relative text-center`}
                >
                  {/* Step number ring */}
                  <div
                    className="relative z-10 mx-auto mb-8 flex h-[120px] w-[120px] items-center justify-center rounded-full"
                    style={{
                      border: `1px solid ${C.border}`,
                      background: `radial-gradient(circle, ${C.surface} 60%, ${C.bg} 100%)`,
                    }}
                  >
                    {/* Outer pulse ring */}
                    <div
                      className="absolute inset-[-8px] rounded-full"
                      style={{
                        border: `1px solid ${C.goldDim}22`,
                        animation: "borderGlow 3s ease-in-out infinite",
                        animationDelay: `${i * 0.5}s`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 36,
                        fontWeight: 200,
                        color: C.gold,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {item.step}
                    </span>
                  </div>

                  <h3
                    className="mb-3 text-xl"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 300,
                      color: C.text,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mx-auto max-w-xs text-base"
                    style={{
                      color: C.textMuted,
                      lineHeight: 1.7,
                      fontWeight: 300,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HudDivider className="my-4" />

        {/* ===== STATS READOUT ===== */}
        <section className="relative z-10 px-6 py-16 md:py-24">
          <div
            ref={statsReveal.ref}
            className={`archive-reveal ${statsReveal.visible ? "visible" : ""} mx-auto max-w-5xl`}
          >
            {/* Section label */}
            <div className="mb-12 text-center">
              <div
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: C.textDim,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Archive Telemetry
              </div>
              <h2
                className="text-4xl md:text-5xl"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 200,
                }}
              >
                Growing every day
              </h2>
            </div>

            <div
              className="overflow-hidden"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${C.surface}44 0%, ${C.bg}88 50%, ${C.surface}22 100%)`,
              }}
            >
              {/* Scan line */}
              <div className="relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, ${C.cyan}06 50%, transparent 100%)`,
                    animation: "scanLine 6s linear infinite",
                    height: "200%",
                  }}
                />
                <div className="grid grid-cols-2 md:grid-cols-4">
                  {STATS.map((stat, i) => (
                    <div
                      key={stat.label}
                      className="relative flex flex-col items-center px-4 py-10 md:py-14"
                      style={{
                        borderRight: i < STATS.length - 1 ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      {/* Mini glow behind number */}
                      <div
                        className="absolute left-1/2 top-1/3 h-20 w-20 -translate-x-1/2 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${C.bloom} 0%, transparent 70%)`,
                          opacity: 0.6,
                        }}
                      />
                      <span
                        className="relative"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 36,
                          fontWeight: 300,
                          color: C.gold,
                          letterSpacing: "0.02em",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <AnimatedCounter value={stat.value} visible={statsReveal.visible} />
                      </span>
                      <span
                        className="mt-3"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 12,
                          color: C.textDim,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {stat.label}
                      </span>
                      {/* Progress bar decoration */}
                      <div
                        className="mt-4 h-0.5 rounded-full"
                        style={{
                          width: `${40 + (i * 15)}%`,
                          background: `linear-gradient(90deg, ${C.goldDim}44, ${C.gold}66)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <HudDivider className="my-4" />

        {/* ===== REVIEWS ===== */}
        <section className="relative z-10 px-6 py-24 md:px-12 md:py-32">
          <DotGrid />
          <div
            ref={reviewsReveal.ref}
            className={`archive-reveal ${reviewsReveal.visible ? "visible" : ""} relative z-10 mx-auto max-w-5xl`}
          >
            <div className="mb-16 text-center">
              <div
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: C.textDim,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Transmission Log
              </div>
              <h2
                className="mb-4 text-4xl md:text-5xl"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 200,
                }}
              >
                From the archive
              </h2>
              <p
                className="mx-auto max-w-md"
                style={{
                  fontSize: 16,
                  color: C.textMuted,
                  lineHeight: 1.7,
                }}
              >
                Real words from real archivists. See what the community is saying.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {REVIEWS.map((review, i) => (
                <div
                  key={i}
                  className={`archive-reveal-delay-${i + 1} group relative overflow-hidden p-6 md:p-8 transition-all duration-300`}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    background: `${C.surface}55`,
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.goldDim + "33";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Game badge */}
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className="relative h-10 w-10 overflow-hidden rounded"
                      style={{
                        background: review.gradient,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {coverUrls?.[review.game] && (
                        <Image
                          src={coverUrls[review.game]}
                          alt={review.game}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 12,
                          color: C.text,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {review.game}
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            size={11}
                            fill={s < review.rating ? C.amber : "transparent"}
                            stroke={s < review.rating ? C.amber : C.textDim}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quote mark */}
                  <div
                    className="mb-3"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 48,
                      lineHeight: 1,
                      color: C.goldDim,
                      opacity: 0.2,
                      fontWeight: 200,
                    }}
                  >
                    &ldquo;
                  </div>
                  <blockquote
                    className="mb-6"
                    style={{
                      fontSize: 15,
                      color: C.textMuted,
                      lineHeight: 1.8,
                      fontWeight: 300,
                      fontStyle: "normal",
                    }}
                  >
                    {review.quote}
                  </blockquote>

                  {/* Divider line */}
                  <div
                    className="mb-4 h-px"
                    style={{ background: `linear-gradient(90deg, ${C.border}, transparent)` }}
                  />

                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 13,
                        color: C.gold,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {review.reviewer}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: C.textDim,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {review.context}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PLATFORM PREVIEW STRIP ===== */}
        <section className="relative z-10 overflow-hidden py-16">
          <div
            className="mx-auto max-w-6xl px-6 md:px-12"
          >
            <div
              className="overflow-hidden rounded"
              style={{
                border: `1px solid ${C.border}`,
                background: `linear-gradient(135deg, ${C.surface}88 0%, ${C.bg} 100%)`,
              }}
            >
              {/* Mock toolbar */}
              <div
                className="flex items-center gap-3 border-b px-5 py-3"
                style={{ borderColor: C.border }}
              >
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#EF4444", opacity: 0.6 }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.amber, opacity: 0.6 }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.green, opacity: 0.6 }} />
                </div>
                <div
                  className="ml-4 flex-1 rounded px-3 py-1 text-center"
                  style={{
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: C.textDim,
                    backgroundColor: C.bg,
                    border: `1px solid ${C.border}`,
                    letterSpacing: "0.02em",
                    maxWidth: 300,
                  }}
                >
                  binnacle.app/collection
                </div>
              </div>

              {/* Mock content */}
              <div className="grid grid-cols-12 gap-4 p-6">
                {/* Sidebar mock */}
                <div className="col-span-3 space-y-3">
                  {["All Games", "Playing", "Completed", "Backlog", "Wishlist"].map((label, i) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded px-3 py-2"
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: i === 0 ? C.text : C.textDim,
                        backgroundColor: i === 0 ? C.goldDim + "22" : "transparent",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: i === 0 ? C.gold
                            : i === 1 ? C.cyan
                            : i === 2 ? C.green
                            : i === 3 ? C.amber
                            : C.accent,
                        }}
                      />
                      {label}
                    </div>
                  ))}
                  <div className="h-px" style={{ backgroundColor: C.border }} />
                  {["RPG", "Indie", "Action"].map((tag) => (
                    <div
                      key={tag}
                      className="px-3 py-1"
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: C.textDim,
                        letterSpacing: "0.08em",
                      }}
                    >
                      # {tag}
                    </div>
                  ))}
                </div>

                {/* Game grid mock */}
                <div className="col-span-9 grid grid-cols-4 gap-3">
                  {ARCHIVE_ITEMS.slice(0, 8).map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div
                        className="relative aspect-[3/4] overflow-hidden rounded"
                        style={{
                          background: item ? item.cover : `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {item && coverUrls?.[item.title] && (
                          <Image
                            src={coverUrls[item.title]}
                            alt={item.title}
                            fill
                            sizes="120px"
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div
                        className="truncate"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 10,
                          color: C.textMuted,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {item ? item.title : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="relative z-10 px-6 py-24 md:py-36">
          <DotGrid />
          <div
            ref={ctaReveal.ref}
            className={`archive-reveal ${ctaReveal.visible ? "visible" : ""} relative z-10 mx-auto max-w-2xl text-center`}
          >
            <HudDivider className="mb-12" />

            <h2
              className="mb-6 text-5xl md:text-6xl lg:text-7xl"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 200,
                lineHeight: 1.15,
              }}
            >
              Your archive
              <br />
              <span style={{ color: C.gold }}>awaits</span>
            </h2>

            <p
              className="mx-auto mb-6 max-w-md"
              style={{
                fontSize: 16,
                color: C.textMuted,
                lineHeight: 1.8,
                fontWeight: 300,
              }}
            >
              Stop losing games in the noise. Start building something that lasts.
            </p>

            {/* Trust badges */}
            <div
              className="mx-auto mb-10 flex items-center justify-center gap-6"
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 11,
                color: C.textDim,
                letterSpacing: "0.08em",
              }}
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.green }} />
                Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.cyan }} />
                No tracking
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.accent }} />
                Open community
              </span>
            </div>

            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-3 transition-all hover:shadow-lg"
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 14,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                backgroundColor: C.gold,
                color: "#fff",
                padding: "16px 40px",
                borderRadius: 2,
                fontWeight: 400,
                boxShadow: `0 0 40px ${C.bloom}`,
              }}
            >
              Begin
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div
              className="mt-8"
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 11,
                color: C.textDim,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Free to use &middot; No credit card
            </div>

            <HudDivider className="mt-12" />
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer
          className="relative z-10 px-6 py-10 md:px-12"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 200,
                fontSize: 16,
                color: C.textDim,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Binnacle
            </span>
            <div
              className="flex items-center gap-6"
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: "0.08em",
              }}
            >
              <Link href="/about" className="transition-colors hover:text-white" style={{ color: C.textDim }}>
                About
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-white" style={{ color: C.textDim }}>
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-white" style={{ color: C.textDim }}>
                Terms
              </Link>
            </div>
            <span
              style={{
                fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                fontSize: 11,
                color: C.textDim,
                letterSpacing: "0.05em",
              }}
            >
              &copy; {new Date().getFullYear()} Binnacle
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
