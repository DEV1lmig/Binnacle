"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FEATURES = [
  {
    num: "01",
    tag: "Backlog",
    headline: "Never forget a game again.",
    body: "Your backlog becomes a living collection\u2014organized, searchable, and always at hand. Whether you\u2019re mid-campaign or saving something for later, every title has its place.",
  },
  {
    num: "02",
    tag: "Reviews",
    headline: "Your thoughts, beautifully captured.",
    body: "Write reviews that feel personal. Rate, reflect, and revisit your experiences with a writing space designed for clarity, not clutter.",
  },
  {
    num: "03",
    tag: "Discovery",
    headline: "Find games worth your time.",
    body: "Surface hidden gems through the tastes of people you trust. No algorithms chasing engagement\u2014just genuine recommendations from real players.",
  },
  {
    num: "04",
    tag: "Community",
    headline: "Connected through play.",
    body: "Follow friends, share collections, and see what the people you admire are playing. A social layer that enhances without overwhelming.",
  },
] as const;

const STATS = [
  { value: "10,000+", label: "Games cataloged" },
  { value: "5,000+", label: "Active members" },
  { value: "50,000+", label: "Reviews written" },
] as const;

function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function FadeIn({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "footer";
}) {
  const { ref, visible } = useFadeIn(0.12);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      {children}
    </Tag>
  );
}

export default function LandingPageV4() {
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

        .stat-cell {
          border-bottom: 1px solid #E5E0D8;
        }
        .stat-cell:last-child {
          border-bottom: none;
        }
        @media (min-width: 768px) {
          .stat-cell {
            border-bottom: none;
            border-right: 1px solid #E5E0D8;
          }
          .stat-cell:last-child {
            border-right: none;
          }
        }
      `}</style>

      <div
        style={{
          backgroundColor: "#FAF8F5",
          color: "#1A1A1A",
          fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
          fontWeight: 300,
          minHeight: "100vh",
        }}
      >
        {/* Nav */}
        <nav
          className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6"
          style={{ borderBottom: "1px solid #E5E0D8" }}
        >
          <Link
            href="/"
            className="text-xl tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Binnacle
          </Link>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#737373" }}>
            <Link
              href="/sign-in"
              className="transition-colors duration-200"
              style={{ color: "#737373" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="transition-colors duration-200"
              style={{ color: "#C2642C" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#A84F1C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C2642C")}
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section
          className="px-6 md:px-12 lg:px-20 py-32 md:py-48"
          style={{
            opacity: heroVisible ? 1 : 0,
            transition: "opacity 1.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
          }}
        >
          <h1
            className="text-6xl md:text-8xl lg:text-[7rem] leading-[0.95] tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 }}
          >
            Every game
            <br />
            deserves a place
            <br />
            in{" "}
            <em style={{ fontStyle: "italic" }}>your&nbsp;story.</em>
          </h1>

          <p
            className="mt-10 md:mt-14 text-lg md:text-xl max-w-2xl leading-relaxed"
            style={{ color: "#737373", fontWeight: 300 }}
          >
            The thoughtful way to track, review, and remember the games that matter to&nbsp;you.
          </p>

          <Link
            href="/sign-up"
            className="inline-block mt-10 px-8 py-3.5 rounded-full text-sm tracking-wide transition-colors duration-200"
            style={{
              backgroundColor: "#C2642C",
              color: "#FAF8F5",
              fontWeight: 400,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#A84F1C")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C2642C")}
          >
            Begin your catalog
          </Link>
        </section>

        {/* Divider with "Features" label */}
        <div className="px-6 md:px-12 lg:px-20 py-4">
          <div className="relative flex items-center">
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E0D8" }} />
            <span
              className="px-5 text-xs uppercase tracking-[0.2em]"
              style={{
                color: "#A3A3A3",
                backgroundColor: "#FAF8F5",
                fontWeight: 400,
              }}
            >
              Features
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E0D8" }} />
          </div>
        </div>

        {/* Feature List */}
        <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.num}>
              <article
                className="py-14 md:py-20"
                style={{
                  borderBottom: i < FEATURES.length - 1 ? "1px solid #E5E0D8" : "none",
                }}
              >
                <span
                  className="text-xs uppercase tracking-[0.15em] inline-block mb-6"
                  style={{ color: "#C2642C", fontWeight: 400 }}
                >
                  {feature.num} — {feature.tag}
                </span>

                <h2
                  className="text-3xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05] mb-6"
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontWeight: 400,
                  }}
                >
                  {feature.headline}
                </h2>

                <p
                  className="text-base md:text-lg max-w-2xl leading-relaxed"
                  style={{ color: "#737373", fontWeight: 300 }}
                >
                  {feature.body}
                </p>
              </article>
            </FadeIn>
          ))}
        </section>

        {/* Pull Quote */}
        <FadeIn as="section" className="px-6 md:px-12 lg:px-20 py-24 md:py-36">
          <blockquote className="max-w-4xl mx-auto text-center">
            <p
              className="text-2xl md:text-4xl lg:text-5xl leading-snug tracking-tight"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              {"\u201C"}A game backlog should feel like a bookshelf, not a&nbsp;spreadsheet.{"\u201D"}
            </p>
            <cite
              className="block mt-8 text-sm not-italic tracking-wide"
              style={{ color: "#A3A3A3", fontWeight: 400 }}
            >
              {"\u2014"}&nbsp;Binnacle
            </cite>
          </blockquote>
        </FadeIn>

        {/* Stats */}
        <FadeIn as="section" className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
          <div
            className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0"
            style={{ borderTop: "1px solid #E5E0D8", borderBottom: "1px solid #E5E0D8" }}
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="stat-cell py-10 md:py-14 text-center"
              >
                <p
                  className="text-4xl md:text-5xl tracking-tight"
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontWeight: 400,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="mt-3 text-sm"
                  style={{ color: "#A3A3A3", fontWeight: 400 }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* CTA */}
        <FadeIn as="section" className="px-6 md:px-12 lg:px-20 py-24 md:py-36 text-center">
          <p
            className="text-3xl md:text-5xl lg:text-6xl tracking-tight"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            Start your collection today.
          </p>
          <Link
            href="/sign-up"
            className="inline-block mt-10 text-base transition-colors duration-200"
            style={{
              color: "#C2642C",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
              textDecorationThickness: "1px",
              fontWeight: 400,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A84F1C")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#C2642C")}
          >
            Create free account&nbsp;&rarr;
          </Link>
        </FadeIn>

        {/* Footer */}
        <footer
          className="px-6 md:px-12 lg:px-20 py-10 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid #E5E0D8" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-lg"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Binnacle
            </span>
            <span className="text-xs" style={{ color: "#A3A3A3" }}>
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#737373" }}>
            <Link
              href="/sign-in"
              className="transition-colors duration-200"
              style={{ color: "#737373" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="transition-colors duration-200"
              style={{ color: "#737373" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
            >
              Sign up
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
