"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Star,
  Users,
  Search,
  BarChart3,
  Layers,
  MessageSquare,
  Compass,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const STATS = [
  { value: 12400, label: "Games Tracked", suffix: "+" },
  { value: 8200, label: "Active Users", suffix: "+" },
  { value: 64000, label: "Reviews Written", suffix: "+" },
  { value: 120, label: "Genres Covered", suffix: "+" },
];

const STEPS = [
  {
    num: "01",
    title: "Build Your Library",
    desc: "Import your existing collection or start fresh. Add games from any platform and organize them your way.",
  },
  {
    num: "02",
    title: "Track & Review",
    desc: "Log your progress, write reviews, rate what you play. Your gaming journal, always up to date.",
  },
  {
    num: "03",
    title: "Connect & Discover",
    desc: "Follow friends, share lists, discover hidden gems through a community that gets it.",
  },
];

function AnimatedCounter({
  target,
  suffix,
  isVisible,
}: {
  target: number;
  suffix: string;
  isVisible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let frame: number;
    const duration = 2000;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function LandingPageV5() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isMobile]
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap');

        .font-syne { font-family: 'Syne', sans-serif; }
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes mesh1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(40%, 20%) scale(1.1); }
        }
        @keyframes mesh2 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(-35%, -40%) scale(1.15); }
        }
        @keyframes mesh3 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(15%, 35%) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: perspective(800px) rotateY(-4deg) rotateX(2deg) translateY(0px); }
          50% { transform: perspective(800px) rotateY(-2deg) rotateX(4deg) translateY(-12px); }
        }
        @keyframes sheen {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-border {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .glass-card:hover .card-sheen {
          opacity: 1;
        }

        .gradient-text {
          background: linear-gradient(135deg, #6366F1, #06B6D4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .btn-gradient {
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .btn-glass {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: all 0.3s ease;
        }
        .btn-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .dot-grid {
          background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .card-sheen {
          opacity: 0;
          transition: opacity 0.5s ease;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 255, 255, 0.03) 45%,
            rgba(255, 255, 255, 0.06) 50%,
            rgba(255, 255, 255, 0.03) 55%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: sheen 3s ease-in-out infinite;
        }

        .gradient-border-wrapper {
          background: linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4);
          border-radius: 26px;
          padding: 1px;
          animation: pulse-border 3s ease-in-out infinite;
        }
        .gradient-border-inner {
          background: #0A0E14;
          border-radius: 25px;
        }
      `}</style>

      <div
        className="font-jakarta"
        style={{
          background: "#0A0E14",
          color: "#F1F5F9",
          minHeight: "100vh",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Gradient Mesh Background */}
        <div
          style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "-10%",
              width: "60%",
              height: "60%",
              borderRadius: "50%",
              background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
              opacity: 0.18,
              filter: "blur(80px)",
              animation: "mesh1 15s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-15%",
              right: "-10%",
              width: "55%",
              height: "55%",
              borderRadius: "50%",
              background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
              opacity: 0.2,
              filter: "blur(90px)",
              animation: "mesh2 20s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "30%",
              width: "50%",
              height: "50%",
              borderRadius: "50%",
              background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
              opacity: 0.15,
              filter: "blur(100px)",
              animation: "mesh3 18s ease-in-out infinite alternate",
            }}
          />
          <div className="dot-grid" style={{ position: "absolute", inset: 0 }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Navigation */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 48px",
              maxWidth: 1280,
              margin: "0 auto",
            }}
          >
            <Link
              href="/"
              className="font-syne"
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                textDecoration: "none",
                color: "#F1F5F9",
              }}
            >
              Binnacle
            </Link>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link
                href="/auth/login"
                className="btn-glass"
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "#F1F5F9",
                }}
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-gradient"
                style={{
                  padding: "10px 24px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "#fff",
                }}
              >
                Get Started
              </Link>
            </div>
          </nav>

          {/* Hero Section */}
          <section
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "80px 48px 100px",
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 64,
              alignItems: "center",
            }}
            className="hero-grid"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 64,
                alignItems: "center",
              }}
              className="hero-inner"
            >
              {/* Hero Text */}
              <div>
                <p
                  className="font-jakarta"
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#818CF8",
                    marginBottom: 12,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  The future of
                </p>
                <h1
                  className="font-syne"
                  style={{
                    fontSize: "clamp(48px, 6vw, 80px)",
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                    marginBottom: 28,
                  }}
                >
                  Game{" "}
                  <span className="gradient-text">Tracking</span>
                </h1>
                <p
                  style={{
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: "#94A3B8",
                    maxWidth: 480,
                    marginBottom: 40,
                  }}
                >
                  Organize your backlog, write reviews that matter, and connect
                  with a community of gamers who care about the craft. Your
                  entire gaming life, one place.
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Link
                    href="/auth/register"
                    className="btn-gradient"
                    style={{
                      padding: "14px 32px",
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      textDecoration: "none",
                      color: "#fff",
                    }}
                  >
                    Get Started <ArrowRight size={18} />
                  </Link>
                  <a
                    href="#features"
                    className="btn-glass"
                    style={{
                      padding: "14px 32px",
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      textDecoration: "none",
                      color: "#F1F5F9",
                    }}
                  >
                    Learn More <ChevronRight size={18} />
                  </a>
                </div>
              </div>

              {/* Hero Floating Card */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  perspective: 800,
                }}
                className="hero-card-wrap"
              >
                <div
                  className="glass-card"
                  style={{
                    padding: 28,
                    width: "100%",
                    maxWidth: 340,
                    animation: "float 6s ease-in-out infinite",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: 16,
                      background:
                        "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2))",
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Gamepad2
                      size={48}
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    />
                  </div>
                  <p
                    className="font-syne"
                    style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}
                  >
                    Elden Ring
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 12,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={16}
                        fill={s <= 4 ? "#818CF8" : "transparent"}
                        color={s <= 4 ? "#818CF8" : "#475569"}
                        strokeWidth={1.5}
                      />
                    ))}
                    <span
                      style={{
                        fontSize: 13,
                        color: "#94A3B8",
                        marginLeft: 6,
                      }}
                    >
                      4.8
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "4px 12px",
                        borderRadius: 20,
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "#818CF8",
                      }}
                    >
                      Playing
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "4px 12px",
                        borderRadius: 20,
                        background: "rgba(255, 255, 255, 0.06)",
                        color: "#94A3B8",
                      }}
                    >
                      Action RPG
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bento Grid Features */}
          <section
            id="features"
            ref={gridRef}
            onMouseMove={handleMouseMove}
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "0 48px 120px",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#818CF8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                Features
              </p>
              <h2
                className="font-syne"
                style={{
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                Everything you need
              </h2>
            </div>

            {/* Mouse-following gradient */}
            {!isMobile && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
                  pointerEvents: "none",
                  left: mousePos.x - 150,
                  top: mousePos.y - 150,
                  transition: "left 0.15s ease-out, top 0.15s ease-out",
                  zIndex: 2,
                }}
              />
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
                position: "relative",
                zIndex: 3,
              }}
              className="bento-grid"
            >
              {/* Card 1: Smart Backlog (2 cols) */}
              <div
                className="glass-card"
                style={{
                  gridColumn: "span 2",
                  padding: 36,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  className="card-sheen"
                  style={{ position: "absolute", inset: 0, borderRadius: 24 }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Layers
                    size={28}
                    style={{ color: "#818CF8", marginBottom: 16 }}
                  />
                  <h3
                    className="font-syne"
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Smart Backlog
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#94A3B8",
                      lineHeight: 1.6,
                      marginBottom: 24,
                      maxWidth: 400,
                    }}
                  >
                    A Kanban-style board that adapts to your play style. Drag,
                    sort, and prioritize your entire library.
                  </p>
                  {/* Mini Kanban Mock */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      overflow: "hidden",
                    }}
                  >
                    {[
                      {
                        title: "Backlog",
                        items: ["Starfield", "FF XVI", "Baldur\u2019s Gate 3"],
                        accent: "#6366F1",
                      },
                      {
                        title: "Playing",
                        items: ["Elden Ring", "Hades II"],
                        accent: "#8B5CF6",
                      },
                      {
                        title: "Done",
                        items: ["Celeste", "Hollow Knight", "Outer Wilds"],
                        accent: "#06B6D4",
                      },
                    ].map((col) => (
                      <div
                        key={col.title}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: col.accent,
                            marginBottom: 10,
                          }}
                        >
                          {col.title}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {col.items.map((item) => (
                            <div
                              key={item}
                              style={{
                                fontSize: 12,
                                padding: "8px 10px",
                                background: "rgba(255,255,255,0.04)",
                                borderRadius: 8,
                                color: "#CBD5E1",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Ratings & Reviews */}
              <div
                className="glass-card"
                style={{ padding: 36, position: "relative", overflow: "hidden" }}
              >
                <div
                  className="card-sheen"
                  style={{ position: "absolute", inset: 0, borderRadius: 24 }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <MessageSquare
                    size={28}
                    style={{ color: "#818CF8", marginBottom: 16 }}
                  />
                  <h3
                    className="font-syne"
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Ratings &amp; Reviews
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#94A3B8",
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    Share your honest takes. Star ratings, written reviews, and
                    game journals.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[5, 4, 3].map((n) => (
                      <div
                        key={n}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              fill={s <= n ? "#818CF8" : "transparent"}
                              color={s <= n ? "#818CF8" : "#334155"}
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: n === 5 ? "65%" : n === 4 ? "25%" : "10%",
                              background:
                                "linear-gradient(90deg, #6366F1, #8B5CF6)",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Social Feed */}
              <div
                className="glass-card"
                style={{ padding: 36, position: "relative", overflow: "hidden" }}
              >
                <div
                  className="card-sheen"
                  style={{ position: "absolute", inset: 0, borderRadius: 24 }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Users
                    size={28}
                    style={{ color: "#818CF8", marginBottom: 16 }}
                  />
                  <h3
                    className="font-syne"
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Social Feed
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#94A3B8",
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    See what friends are playing, follow curators, and share
                    your milestones.
                  </p>
                  <div style={{ display: "flex", gap: -8 }}>
                    {["#6366F1", "#8B5CF6", "#06B6D4", "#818CF8", "#A78BFA"].map(
                      (c, i) => (
                        <div
                          key={i}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: c,
                            border: "2px solid #0A0E14",
                            marginLeft: i > 0 ? -10 : 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#fff",
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      )
                    )}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        border: "2px solid #0A0E14",
                        marginLeft: -10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#94A3B8",
                      }}
                    >
                      +3K
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Discovery Engine (2 cols) */}
              <div
                className="glass-card"
                style={{
                  gridColumn: "span 2",
                  padding: 36,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  className="card-sheen"
                  style={{ position: "absolute", inset: 0, borderRadius: 24 }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Compass
                    size={28}
                    style={{ color: "#818CF8", marginBottom: 16 }}
                  />
                  <h3
                    className="font-syne"
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Discovery Engine
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#94A3B8",
                      lineHeight: 1.6,
                      marginBottom: 20,
                      maxWidth: 420,
                    }}
                  >
                    Personalized recommendations powered by your taste, not
                    algorithms chasing engagement.
                  </p>
                  {/* Search bar mock */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.06)",
                      marginBottom: 16,
                    }}
                  >
                    <Search size={18} style={{ color: "#475569" }} />
                    <span style={{ fontSize: 14, color: "#475569" }}>
                      Search games, genres, or tags&hellip;
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      "Metroidvania",
                      "Soulslike",
                      "Roguelike",
                      "Narrative",
                      "Open World",
                    ].map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: "rgba(99, 102, 241, 0.1)",
                          color: "#A5B4FC",
                          border: "1px solid rgba(99, 102, 241, 0.15)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 5: Community Stats (full width) */}
              <div
                className="glass-card"
                style={{
                  gridColumn: "span 3",
                  padding: "28px 36px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  className="card-sheen"
                  style={{ position: "absolute", inset: 0, borderRadius: 24 }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <BarChart3
                    size={24}
                    style={{ color: "#818CF8", flexShrink: 0 }}
                  />
                  <h3
                    className="font-syne"
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Community Stats
                  </h3>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "space-around",
                      alignItems: "center",
                    }}
                    className="stats-bar"
                  >
                    {[
                      { label: "Games Added Today", value: "342" },
                      { label: "Active Now", value: "1.2K" },
                      { label: "Reviews This Week", value: "4.8K" },
                      { label: "Lists Created", value: "890" },
                    ].map((s, i, arr) => (
                      <div
                        key={s.label}
                        style={{
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          gap: 20,
                        }}
                      >
                        <div>
                          <p
                            className="font-syne gradient-text"
                            style={{ fontSize: 22, fontWeight: 700 }}
                          >
                            {s.value}
                          </p>
                          <p style={{ fontSize: 12, color: "#64748B" }}>
                            {s.label}
                          </p>
                        </div>
                        {i < arr.length - 1 && (
                          <div
                            style={{
                              width: 1,
                              height: 32,
                              background: "rgba(255,255,255,0.08)",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section ref={statsRef} style={{ padding: "0 48px 120px", maxWidth: 1280, margin: "0 auto" }}>
            <div className="glass-card" style={{ padding: "48px 40px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 0,
                }}
                className="stats-grid"
              >
                {STATS.map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      textAlign: "center",
                      borderRight:
                        i < STATS.length - 1
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "none",
                      padding: "0 24px",
                    }}
                    className="stat-cell"
                  >
                    <p
                      className="font-syne gradient-text"
                      style={{
                        fontSize: "clamp(28px, 3.5vw, 44px)",
                        fontWeight: 800,
                        marginBottom: 8,
                      }}
                    >
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                        isVisible={statsVisible}
                      />
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section style={{ padding: "0 48px 120px", maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#818CF8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                How It Works
              </p>
              <h2
                className="font-syne"
                style={{
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                Three steps to bliss
              </h2>
            </div>

            <div style={{ position: "relative" }}>
              {/* Connecting gradient line */}
              <div
                aria-hidden="true"
                className="steps-line"
                style={{
                  position: "absolute",
                  top: 52,
                  left: "16%",
                  right: "16%",
                  height: 2,
                  background:
                    "linear-gradient(90deg, #6366F1, #8B5CF6, #06B6D4)",
                  borderRadius: 1,
                  zIndex: 0,
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 24,
                  position: "relative",
                  zIndex: 1,
                }}
                className="steps-grid"
              >
                {STEPS.map((step) => (
                  <div
                    key={step.num}
                    className="glass-card"
                    style={{
                      padding: 36,
                      textAlign: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="card-sheen"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 24,
                      }}
                    />
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <p
                        className="font-syne gradient-text"
                        style={{
                          fontSize: 48,
                          fontWeight: 800,
                          marginBottom: 16,
                          lineHeight: 1,
                        }}
                      >
                        {step.num}
                      </p>
                      <h3
                        className="font-syne"
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 15,
                          color: "#94A3B8",
                          lineHeight: 1.7,
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section style={{ padding: "0 48px 120px", maxWidth: 1280, margin: "0 auto" }}>
            <div className="gradient-border-wrapper">
              <div
                className="gradient-border-inner"
                style={{
                  padding: "72px 48px",
                  textAlign: "center",
                }}
              >
                <Sparkles
                  size={32}
                  style={{ color: "#818CF8", marginBottom: 20, display: "inline-block" }}
                />
                <h2
                  className="font-syne"
                  style={{
                    fontSize: "clamp(32px, 4vw, 52px)",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    marginBottom: 16,
                  }}
                >
                  Ready to level up?
                </h2>
                <p
                  style={{
                    fontSize: 18,
                    color: "#94A3B8",
                    lineHeight: 1.7,
                    maxWidth: 520,
                    margin: "0 auto 36px",
                  }}
                >
                  Join thousands of gamers tracking their journey. Your backlog
                  deserves better than a spreadsheet.
                </p>
                <Link
                  href="/auth/register"
                  className="btn-gradient"
                  style={{
                    padding: "16px 40px",
                    borderRadius: 14,
                    fontSize: 17,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    textDecoration: "none",
                    color: "#fff",
                  }}
                >
                  Start Your Collection <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "36px 48px",
              maxWidth: 1280,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <p
                className="font-syne"
                style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}
              >
                Binnacle
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {["About", "Privacy", "Terms", "Contact"].map((l) => (
                  <Link
                    key={l}
                    href={`/${l.toLowerCase()}`}
                    style={{
                      fontSize: 13,
                      color: "#64748B",
                      textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#94A3B8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#64748B")
                    }
                  >
                    {l}
                  </Link>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "#475569" }}>
                &copy; {new Date().getFullYear()} Binnacle
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .hero-inner {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
          .hero-card-wrap {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > div {
            grid-column: span 1 !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px !important;
          }
          .stat-cell {
            border-right: none !important;
            padding: 0 !important;
          }
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
          .steps-line {
            display: none !important;
          }
          .stats-bar {
            flex-wrap: wrap !important;
            gap: 16px !important;
          }
          section, nav, footer {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }
      `}</style>
    </>
  );
}
