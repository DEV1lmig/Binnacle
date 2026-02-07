"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gamepad2, MessageSquareText, Users } from "lucide-react";

// ---------------------------------------------------------------------------
// Arcade Marquee Landing Page - v3
// ---------------------------------------------------------------------------

const NEON = {
  cyan: "#00FFE5",
  pink: "#FF2D8A",
  green: "#39FF14",
  yellow: "#FFE500",
} as const;

function glowText(color: string, blur = 12) {
  return `0 0 ${blur}px ${color}, 0 0 ${blur * 2}px ${color}80, 0 0 ${blur * 3}px ${color}40`;
}

function glowBox(color: string, blur = 16) {
  return `0 0 ${blur}px ${color}90, 0 0 ${blur * 2}px ${color}50`;
}

// ---------------------------------------------------------------------------
// Slot-machine number animation hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  return { ref, value, started };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 3px)",
        backgroundSize: "100% 3px",
        animation: "scanlines 8s linear infinite",
      }}
    />
  );
}

function NeonButton({
  children,
  href,
  color = NEON.cyan,
  pulse = false,
  blink = false,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  color?: string;
  pulse?: boolean;
  blink?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`
        relative inline-block rounded-full border-2 px-10 py-4 text-center
        font-display text-lg font-black uppercase tracking-widest
        transition-all duration-200 hover:scale-105
        ${blink ? "animate-blink" : ""}
        ${className}
      `}
      style={{
        borderColor: color,
        color: color,
        textShadow: glowText(color, 8),
        boxShadow: pulse ? undefined : `inset 0 0 20px ${color}15, ${glowBox(color, 8)}`,
        animation: pulse
          ? `glowPulse 2s ease-in-out infinite, ${blink ? "blink 1.2s steps(2,start) infinite" : ""}`
          : blink
            ? "blink 1.2s steps(2,start) infinite"
            : undefined,
      }}
    >
      {children}
    </Link>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof Gamepad2;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="group relative flex flex-col gap-5 border-l-2 bg-gradient-to-br from-[#111113] to-[#09090B] p-8 transition-all duration-300 hover:from-[#161618]"
      style={{ borderColor: color }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `inset 0 0 40px ${color}08, -4px 0 20px ${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <Icon size={36} style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
      <h3
        className="font-display text-xl font-black uppercase tracking-wider md:text-2xl"
        style={{ color, textShadow: glowText(color, 6) }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[#a1a1aa]" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {description}
      </p>
    </div>
  );
}

function StatSlot({ target, label, color }: { target: number; label: string; color: string }) {
  const { ref, value, started } = useCountUp(target);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden rounded-md border border-[#27272a] bg-[#0a0a0c] px-6 py-5 md:px-10 md:py-6"
        style={{
          boxShadow: `inset 0 2px 12px rgba(0,0,0,0.8), 0 0 1px ${color}40`,
        }}
      >
        <span
          className="block text-3xl font-black tracking-tight md:text-5xl"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontVariantNumeric: "tabular-nums",
            color,
            textShadow: glowText(color, 8),
            transform: started ? "translateY(0)" : "translateY(40px)",
            opacity: started ? 1 : 0,
            transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.6s ease",
          }}
        >
          {value.toLocaleString()}+
        </span>
      </div>
      <span
        className="font-display text-xs font-black uppercase tracking-[0.25em] md:text-sm"
        style={{ color: "#71717A" }}
      >
        {label}
      </span>
    </div>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div
      className="relative border border-[#27272a] bg-[#111113] p-6 md:p-8"
      style={{ boxShadow: `inset 0 0 30px rgba(0,0,0,0.5)` }}
    >
      <span
        className="font-display text-xs font-black uppercase tracking-[0.3em]"
        style={{ color: NEON.yellow, textShadow: glowText(NEON.yellow, 4) }}
      >
        {step}
      </span>
      <h4
        className="mt-3 font-display text-lg font-black uppercase tracking-wider text-white md:text-xl"
      >
        {title}
      </h4>
      <p
        className="mt-2 text-sm leading-relaxed text-[#a1a1aa]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ArcadeMarqueeLanding() {
  return (
    <>
      {/* Fonts & Global Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Outfit:wght@300;400;500;600;700&display=swap');

        .font-display {
          font-family: 'Archivo Black', 'Impact', sans-serif;
        }

        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100vh; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow: inset 0 0 20px ${NEON.cyan}15, 0 0 16px ${NEON.cyan}90, 0 0 32px ${NEON.cyan}50;
          }
          50% {
            box-shadow: inset 0 0 30px ${NEON.cyan}25, 0 0 30px ${NEON.cyan}bb, 0 0 60px ${NEON.cyan}70;
          }
        }

        @keyframes subtleDrift {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }

        .animate-blink {
          animation: blink 1.2s steps(2, start) infinite;
        }

        ::selection {
          background: ${NEON.cyan}30;
          color: ${NEON.cyan};
        }

        * { box-sizing: border-box; }
      `}</style>

      <div
        className="relative min-h-screen w-full overflow-x-hidden"
        style={{
          backgroundColor: "#09090B",
          color: "#ffffff",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* ----------------------------------------------------------------- */}
        {/* HERO - INSERT COIN                                                */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
          {/* CRT blue tint overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "rgba(0, 255, 229, 0.03)",
              animation: "subtleDrift 6s ease-in-out infinite",
            }}
          />

          {/* CRT screen curvature */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-4 rounded-[40px] md:inset-8 lg:inset-12"
            style={{
              boxShadow:
                "inset 0 0 80px rgba(0,0,0,0.8), inset 0 0 200px rgba(0,0,0,0.4)",
            }}
          />

          {/* Scanlines */}
          <ScanlineOverlay />

          {/* Content */}
          <div className="relative z-20 flex flex-col items-center gap-6 text-center">
            {/* BINNACLE */}
            <h1
              className="font-display text-7xl font-black uppercase leading-none tracking-tight md:text-9xl"
              style={{
                color: NEON.cyan,
                textShadow: glowText(NEON.cyan, 16),
              }}
            >
              Binnacle
            </h1>

            {/* Tagline */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:gap-x-5">
              {(["TRACK", "REVIEW", "DISCOVER"] as const).map((word, i) => {
                const colors = [NEON.pink, NEON.yellow, NEON.green];
                const c = colors[i];
                return (
                  <span
                    key={word}
                    className="font-display text-xl font-black uppercase tracking-widest md:text-3xl"
                    style={{ color: c, textShadow: glowText(c, 10) }}
                  >
                    {word}{i < 2 ? "." : "."}
                  </span>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-8">
              <NeonButton href="/sign-up" pulse blink>
                Press Start
              </NeonButton>
            </div>
          </div>

          {/* INSERT COIN */}
          <div className="absolute bottom-10 z-20">
            <Link
              href="/sign-up"
              className="animate-blink font-display text-xs font-black uppercase tracking-[0.3em] transition-colors hover:text-[#00FFE5]"
              style={{ color: "#71717A" }}
            >
              Insert Coin to Continue
            </Link>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* FEATURES - NEON CARDS                                             */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Gamepad2}
              title="Backlog Tracker"
              description="Queue up your next adventure. Track every game across every platform. Never lose sight of what to play next."
              color={NEON.cyan}
            />
            <FeatureCard
              icon={MessageSquareText}
              title="Review System"
              description="Rate and review with depth. Share your takes with a community that actually cares about games."
              color={NEON.pink}
            />
            <FeatureCard
              icon={Users}
              title="Social Feed"
              description="See what your friends are playing. Discover hidden gems through the people you trust most."
              color={NEON.green}
            />
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* STATS - SLOT MACHINE                                              */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative py-24 md:py-32">
          {/* Faint horizontal rule */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${NEON.cyan}30, transparent)`,
            }}
          />

          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4 md:gap-16">
            <StatSlot target={10000} label="Games" color={NEON.cyan} />
            <StatSlot target={5000} label="Players" color={NEON.pink} />
            <StatSlot target={50000} label="Reviews" color={NEON.green} />
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* HOW TO PLAY                                                       */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative mx-auto max-w-5xl px-4 py-24 md:py-32">
          <h2
            className="mb-16 text-center font-display text-3xl font-black uppercase tracking-wider md:text-5xl"
            style={{ color: NEON.yellow, textShadow: glowText(NEON.yellow, 10) }}
          >
            How to Play
          </h2>

          <div className="grid gap-0 md:grid-cols-3">
            {[
              {
                step: "Step 01",
                title: "Create Your Profile",
                description:
                  "Pick a handle, set your avatar, and declare your platform allegiance. Your arcade cabinet awaits.",
              },
              {
                step: "Step 02",
                title: "Build Your Backlog",
                description:
                  "Add games you want to play, are playing, or have conquered. Organize your entire gaming history.",
              },
              {
                step: "Step 03",
                title: "Join the Arena",
                description:
                  "Write reviews, follow friends, discover what the community is buzzing about. Your voice matters here.",
              },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connecting dashed line */}
                {i < 2 && (
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 hidden h-0 w-6 -translate-y-1/2 translate-x-full border-t-2 border-dashed md:block"
                    style={{ borderColor: `${NEON.cyan}50` }}
                  />
                )}
                <StepCard {...s} />
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* CTA - GAME OVER? NEVER.                                           */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative flex flex-col items-center gap-8 px-4 py-24 text-center md:py-32">
          {/* Faint rule */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${NEON.pink}30, transparent)`,
            }}
          />

          <div>
            <h2
              className="font-display text-4xl font-black uppercase tracking-wider md:text-7xl"
              style={{
                color: "#71717A",
                textDecoration: "line-through",
                textDecorationColor: NEON.pink,
                textDecorationThickness: "3px",
              }}
            >
              Game Over?
            </h2>
            <h2
              className="mt-2 font-display text-5xl font-black uppercase tracking-wider md:text-8xl"
              style={{ color: NEON.cyan, textShadow: glowText(NEON.cyan, 20) }}
            >
              Never.
            </h2>
          </div>

          <div className="mt-4">
            <NeonButton href="/sign-up" pulse>
              Start Playing
            </NeonButton>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* FOOTER                                                            */}
        {/* ----------------------------------------------------------------- */}
        <footer className="border-t border-[#1a1a1e] py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4">
            <span
              className="font-display text-sm font-black uppercase tracking-[0.4em]"
              style={{ color: "#3f3f46" }}
            >
              Binnacle // 2025
            </span>
            <div className="flex gap-6">
              <Link
                href="/sign-in"
                className="text-sm uppercase tracking-wider transition-colors hover:underline"
                style={{ color: NEON.cyan, fontFamily: "'Outfit', sans-serif" }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-sm uppercase tracking-wider transition-colors hover:underline"
                style={{ color: NEON.cyan, fontFamily: "'Outfit', sans-serif" }}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
