"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Star,
  Users,
  Compass,
  BarChart3,
  Bell,
  Play,
  ChevronRight,
  UserPlus,
  Library,
  Share2,
  Gamepad2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Animated counter hook - counts from 0 to `end` over `duration` ms
// ---------------------------------------------------------------------------
function useCountUp(end: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, end, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Fake game cards for the mock dashboard
// ---------------------------------------------------------------------------
const KANBAN_DATA = {
  playing: [
    { title: "Elden Ring", color: "#c9a84c" },
    { title: "Hades II", color: "#e05252" },
  ],
  backlog: [
    { title: "Silksong", color: "#4ca5c9" },
    { title: "Metaphor", color: "#9b6fc9" },
    { title: "Outer Wilds", color: "#52c97a" },
  ],
  completed: [
    { title: "Celeste", color: "#e06fa8" },
    { title: "Disco Elysium", color: "#c97a4c" },
  ],
};

// ---------------------------------------------------------------------------
// Feature cards data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Backlog Tracking",
    desc: "Kanban boards, lists, and smart filters to tame your ever-growing pile of shame.",
    large: true,
  },
  {
    icon: Star,
    title: "Reviews",
    desc: "Rate and review every game you play. Share your hot takes.",
  },
  {
    icon: Users,
    title: "Social Feed",
    desc: "See what friends are playing, completing, and recommending.",
  },
  {
    icon: Compass,
    title: "Discovery",
    desc: "Personalized recommendations based on your taste profile.",
  },
  {
    icon: BarChart3,
    title: "Stats",
    desc: "Playtime heatmaps, genre breakdowns, and completion rates.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Get pinged when friends review a game on your wishlist.",
  },
];

// ---------------------------------------------------------------------------
// Stats data
// ---------------------------------------------------------------------------
const STATS = [
  { label: "Games Tracked", value: 10000, suffix: "+" },
  { label: "Gamers", value: 5000, suffix: "+" },
  { label: "Reviews Written", value: 50000, suffix: "+" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function LandingPageV1() {
  const [statsVisible, setStatsVisible] = useState(false);
  const [dashHovered, setDashHovered] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // Intersection observer for stat counters
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* --- Inline styles: fonts, keyframes, grain overlay --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

        .lp-v1 {
          font-family: 'DM Sans', sans-serif;
          background: #0C0D0F;
          color: #E8EAED;
          scroll-behavior: smooth;
        }
        .lp-v1 * { box-sizing: border-box; }

        .font-display {
          font-family: 'DM Sans', sans-serif;
          font-weight: 800;
        }

        /* Grain overlay */
        .grain::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }

        /* Scanline animation */
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(102, 192, 244, 0.03) 2px,
            rgba(102, 192, 244, 0.03) 3px
          );
          background-size: 100% 6px;
          animation: scanline 8s linear infinite;
        }

        /* Float animation */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float { animation: float 6s ease-in-out infinite; }

        /* Glow pulse on CTAs */
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 192, 244, 0.2); }
          50% { box-shadow: 0 0 35px rgba(102, 192, 244, 0.4); }
        }
        .glow-pulse:hover { animation: glowPulse 2s ease-in-out infinite; }

        /* Gradient border trick for the CTA card */
        .gradient-border {
          position: relative;
          background: #141517;
          border-radius: 16px;
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 1px;
          background: linear-gradient(135deg, #66c0f4, #e1b168, #66c0f4);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* Timeline connector */
        .timeline-line {
          position: absolute;
          top: 24px;
          left: 24px;
          right: 24px;
          height: 2px;
          background: linear-gradient(90deg, #66c0f4, #e1b168);
          z-index: 0;
        }
      `}</style>

      <div className="lp-v1 grain" style={{ minHeight: "100vh", overflowX: "hidden" }}>
        {/* ================================================================ */}
        {/* NAV */}
        {/* ================================================================ */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "rgba(12, 13, 15, 0.8)",
            borderBottom: "1px solid #1E2023",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "#E8EAED",
              }}
            >
              <Gamepad2 size={24} color="#66c0f4" />
              <span className="font-display" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
                Binnacle
              </span>
            </Link>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link
                href="/sign-in"
                style={{
                  color: "#8B8D93",
                  textDecoration: "none",
                  fontSize: 14,
                  padding: "8px 16px",
                  borderRadius: 8,
                  transition: "color 0.2s",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                style={{
                  background: "#66c0f4",
                  color: "#0C0D0F",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "8px 20px",
                  borderRadius: 8,
                  transition: "opacity 0.2s",
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* ================================================================ */}
        {/* HERO */}
        {/* ================================================================ */}
        <section
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 24px 100px",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 48,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* --- Left: Copy --- */}
          <div style={{ maxWidth: 540 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#66c0f4",
                marginBottom: 16,
              }}
            >
              Now in Early Access
            </p>
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(36px, 5vw, 60px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                margin: "0 0 20px",
              }}
            >
              Your Gaming
              <br />
              <span style={{ color: "#66c0f4" }}>Command Center</span>
            </h1>
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: "#8B8D93",
                margin: "0 0 36px",
                maxWidth: 440,
              }}
            >
              Track your backlog. Write reviews. Discover what&#8217;s next.
              One&nbsp;dashboard to rule them all.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link
                href="/sign-up"
                className="glow-pulse"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#66c0f4",
                  color: "#0C0D0F",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 28px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "transform 0.2s",
                }}
              >
                Launch Dashboard <ChevronRight size={16} />
              </Link>
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: "#E8EAED",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "14px 28px",
                  borderRadius: 10,
                  border: "1px solid #1E2023",
                  cursor: "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#66c0f4";
                  e.currentTarget.style.background = "rgba(102,192,244,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E2023";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Play size={14} fill="#E8EAED" /> Watch Demo
              </button>
            </div>
          </div>

          {/* --- Right: Mock Dashboard (desktop only) --- */}
          <DashboardMock hovered={dashHovered} setHovered={setDashHovered} />
        </section>

        {/* Responsive override for hero grid */}
        <style>{`
          @media (min-width: 1024px) {
            .hero-grid {
              grid-template-columns: 1fr 1.15fr !important;
              padding-top: 100px !important;
              padding-bottom: 120px !important;
            }
          }
        `}</style>

        {/* ================================================================ */}
        {/* BENTO FEATURES GRID */}
        {/* ================================================================ */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 120px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 3.5vw, 42px)",
                letterSpacing: "-0.02em",
                margin: "0 0 12px",
              }}
            >
              Everything you need
            </h2>
            <p style={{ color: "#8B8D93", fontSize: 16, margin: 0 }}>
              Built for gamers who take their hobby seriously.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
            className="bento-grid"
          >
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>

          <style>{`
            @media (min-width: 768px) {
              .bento-grid {
                grid-template-columns: repeat(3, 1fr) !important;
              }
              .bento-grid > :first-child {
                grid-column: span 2;
              }
            }
          `}</style>
        </section>

        {/* ================================================================ */}
        {/* STATS STRIP */}
        {/* ================================================================ */}
        <section
          ref={statsRef}
          style={{
            borderTop: "1px solid #1E2023",
            borderBottom: "1px solid #1E2023",
            padding: "56px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 32,
              textAlign: "center",
            }}
          >
            {STATS.map((s) => (
              <StatItem key={s.label} {...s} visible={statsVisible} />
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* HOW IT WORKS */}
        {/* ================================================================ */}
        <section style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px" }}>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(28px, 3.5vw, 42px)",
              letterSpacing: "-0.02em",
              textAlign: "center",
              margin: "0 0 64px",
            }}
          >
            Get started in minutes
          </h2>

          <div style={{ position: "relative" }}>
            {/* Connecting line (desktop) */}
            <div className="timeline-line" style={{ display: "none" }} />
            <style>{`
              @media (min-width: 640px) {
                .timeline-line { display: block !important; }
              }
            `}</style>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 48,
                position: "relative",
                zIndex: 1,
              }}
            >
              <TimelineStep num={1} icon={UserPlus} title="Sign Up" desc="Create your free account in seconds. No credit card needed." />
              <TimelineStep num={2} icon={Library} title="Build Your Library" desc="Import games or add them manually. Organize into lists and boards." />
              <TimelineStep num={3} icon={Share2} title="Connect & Share" desc="Follow friends, write reviews, and discover your next favorite game." />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CTA SECTION */}
        {/* ================================================================ */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px" }}>
          <div
            className="gradient-border"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(26px, 3.5vw, 40px)",
                letterSpacing: "-0.02em",
                margin: "0 0 16px",
              }}
            >
              Ready to take command?
            </h2>
            <p style={{ color: "#8B8D93", fontSize: 16, margin: "0 0 36px", maxWidth: 420, marginInline: "auto" }}>
              Join thousands of gamers already organizing their libraries and sharing discoveries.
            </p>
            <Link
              href="/sign-up"
              className="glow-pulse"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#66c0f4",
                color: "#0C0D0F",
                fontWeight: 700,
                fontSize: 16,
                padding: "16px 36px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Create Free Account <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FOOTER */}
        {/* ================================================================ */}
        <footer
          style={{
            borderTop: "1px solid #1E2023",
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Gamepad2 size={18} color="#66c0f4" />
              <span style={{ fontSize: 14, color: "#8B8D93" }}>
                &copy; {new Date().getFullYear()} Binnacle
              </span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <Link href="/sign-in" style={{ color: "#8B8D93", textDecoration: "none", fontSize: 13 }}>
                Sign In
              </Link>
              <Link href="/sign-up" style={{ color: "#8B8D93", textDecoration: "none", fontSize: 13 }}>
                Sign Up
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ===========================================================================
// SUB-COMPONENTS
// ===========================================================================

function DashboardMock({
  hovered,
  setHovered,
}: {
  hovered: boolean;
  setHovered: (v: boolean) => void;
}) {
  const perspective = hovered
    ? "perspective(1200px) rotateY(0deg) rotateX(0deg)"
    : "perspective(1200px) rotateY(-8deg) rotateX(4deg)";

  return (
    <div
      className="float"
      style={{ display: "none" }}
      /* shown via media query below */
    >
      <style>{`
        @media (min-width: 1024px) {
          .dash-wrapper { display: block !important; }
        }
      `}</style>
      <div
        className="dash-wrapper"
        style={{ display: "none" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          style={{
            transform: perspective,
            transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            background: "#141517",
            borderRadius: 16,
            border: "1px solid #1E2023",
            padding: 20,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(102,192,244,0.08)",
          }}
        >
          {/* Scanline overlay */}
          <div className="scanlines" style={{ borderRadius: 16 }} />

          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e05252" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e1b168" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#52c97a" }} />
            </div>
            <span style={{ fontSize: 12, color: "#8B8D93", marginLeft: 8 }}>
              binnacle.gg/dashboard
            </span>
          </div>

          {/* Kanban columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              position: "relative",
              zIndex: 1,
            }}
          >
            {(Object.entries(KANBAN_DATA) as [string, typeof KANBAN_DATA.playing][]).map(
              ([col, games]) => (
                <div key={col}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#8B8D93",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{col}</span>
                    <span
                      style={{
                        background: "#1E2023",
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontSize: 10,
                        color: "#66c0f4",
                      }}
                    >
                      {games.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {games.map((g) => (
                      <div
                        key={g.title}
                        style={{
                          background: "#1A1B1E",
                          borderRadius: 8,
                          padding: "10px 12px",
                          border: "1px solid #1E2023",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: `linear-gradient(135deg, ${g.color}, ${g.color}88)`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#E8EAED" }}>
                          {g.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  large,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
  large?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "#141517",
        borderRadius: 14,
        border: `1px solid ${isHovered ? "rgba(102,192,244,0.3)" : "#1E2023"}`,
        padding: large ? "32px 28px" : "24px 22px",
        transition: "border-color 0.3s, box-shadow 0.3s",
        boxShadow: isHovered ? "0 0 30px rgba(102,192,244,0.08)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "rgba(102,192,244,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color="#66c0f4" />
      </div>
      <h3
        className="font-display"
        style={{ fontSize: large ? 22 : 17, margin: 0, letterSpacing: "-0.01em" }}
      >
        {title}
      </h3>
      <p style={{ color: "#8B8D93", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>

      {large && <MiniChart />}
    </div>
  );
}

function MiniChart() {
  const bars = [35, 55, 42, 70, 58, 85, 65, 78, 90, 72, 60, 82];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "#8B8D93", marginBottom: 8 }}>
        Games added this year
      </div>
      <svg
        viewBox="0 0 240 60"
        style={{ width: "100%", maxWidth: 280, height: 60 }}
        aria-hidden="true"
      >
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 20}
            y={60 - h * 0.6}
            width={14}
            height={h * 0.6}
            rx={3}
            fill={i === bars.length - 1 ? "#66c0f4" : "#1E2023"}
            style={{ transition: "fill 0.3s" }}
          />
        ))}
      </svg>
    </div>
  );
}

function StatItem({
  label,
  value,
  suffix,
  visible,
}: {
  label: string;
  value: number;
  suffix: string;
  visible: boolean;
}) {
  const count = useCountUp(value, 2000, visible);

  return (
    <div>
      <div
        className="font-display"
        style={{
          fontSize: "clamp(32px, 4vw, 48px)",
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color: "#E8EAED",
        }}
      >
        {count.toLocaleString()}
        {suffix}
      </div>
      <div style={{ fontSize: 14, color: "#8B8D93", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function TimelineStep({
  num,
  icon: Icon,
  title,
  desc,
}: {
  num: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #66c0f4, #4a9fd4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 0 20px rgba(102,192,244,0.2)",
        }}
      >
        <Icon size={20} color="#0C0D0F" />
      </div>
      <div
        className="font-display"
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#66c0f4",
          marginBottom: 6,
        }}
      >
        Step {num}
      </div>
      <h3
        className="font-display"
        style={{ fontSize: 18, margin: "0 0 8px", letterSpacing: "-0.01em" }}
      >
        {title}
      </h3>
      <p style={{ color: "#8B8D93", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}
