"use client";

import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";

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
  accent: "#A78BFA",
  green: "#34D399",
} as const;

const fieldClasses =
  `w-full rounded-sm border px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:tracking-wide`;

function GrainOverlay() {
  return (
    <svg className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.025]">
      <filter id="signInGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#signInGrain)" />
    </svg>
  );
}

function CornerMarkers({ size = 12 }: { size?: number }) {
  const color = `${C.borderLight}`;
  return (
    <>
      <span className="absolute top-0 left-0" style={{ width: size, height: size, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span className="absolute top-0 right-0" style={{ width: size, height: size, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
      <span className="absolute bottom-0 left-0" style={{ width: size, height: size, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span className="absolute bottom-0 right-0" style={{ width: size, height: size, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
    </>
  );
}

export default function SignInPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Outfit:wght@200;300;400&family=JetBrains+Mono:wght@300;400&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .signin-reveal { animation: fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
        .signin-reveal-d1 { animation-delay: 0.1s; }
        .signin-reveal-d2 { animation-delay: 0.2s; }
        .signin-reveal-d3 { animation-delay: 0.3s; }
        .signin-reveal-d4 { animation-delay: 0.4s; }

        .auth-field:focus-within { border-color: ${C.cyan}88 !important; box-shadow: 0 0 0 1px ${C.cyan}22; }
        .auth-btn-social:hover { border-color: ${C.gold}66 !important; background-color: ${C.bgAlt} !important; }
        .auth-btn-social:focus-visible { outline: 1px solid ${C.gold}88; outline-offset: 2px; }
      `}</style>

      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16"
        style={{
          backgroundColor: C.bg,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
        }}
      >
        <GrainOverlay />

        {/* Background ambient glow */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute rounded-full"
            style={{
              width: 800,
              height: 800,
              right: "-15%",
              top: "-20%",
              background: `radial-gradient(circle, rgba(96, 165, 250, 0.06) 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 600,
              height: 600,
              left: "-10%",
              bottom: "-15%",
              background: `radial-gradient(circle, rgba(167, 139, 250, 0.04) 0%, transparent 70%)`,
            }}
          />
        </div>

        <div
          className="relative z-10 grid w-full max-w-5xl overflow-hidden signin-reveal"
          style={{
            borderRadius: 2,
            border: `1px solid ${C.border}`,
            backgroundColor: C.bg,
          }}
        >
          <div className="grid lg:grid-cols-[1fr_420px]">
            {/* Left panel -- brand showcase */}
            <section
              className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
              style={{
                borderRight: `1px solid ${C.border}`,
                background: `linear-gradient(135deg, ${C.bgAlt} 0%, ${C.bg} 100%)`,
              }}
            >
              <CornerMarkers size={16} />

              {/* Dot grid */}
              <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                  opacity: 0.3,
                }}
              />

              {/* Scan line effect */}
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(180deg, transparent 0%, rgba(96, 165, 250, 0.03) 50%, transparent 100%)`,
                    animation: "scanLine 8s linear infinite",
                  }}
                />
              </div>

              <div className="relative z-10 flex flex-col gap-8">
                <Link
                  href="/"
                  className="tracking-widest transition-opacity hover:opacity-80"
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

                <div className="signin-reveal-d2">
                  <div
                    className="mb-6 inline-block"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: C.cyan,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      border: `1px solid ${C.cyanDim}33`,
                      borderRadius: 1,
                    }}
                  >
                    Authentication Portal
                  </div>

                  <h1
                    className="mb-4"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 200,
                      fontSize: 40,
                      lineHeight: 1.15,
                      color: C.text,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Welcome back,{" "}
                    <span style={{ color: C.gold, fontWeight: 300 }}>archivist</span>.
                  </h1>

                  <p
                    className="max-w-sm"
                    style={{
                      fontSize: 15,
                      color: C.textMuted,
                      lineHeight: 1.8,
                      fontWeight: 300,
                    }}
                  >
                    Your collection is waiting. Sign in to continue tracking, reviewing,
                    and discovering.
                  </p>
                </div>
              </div>

              <ul className="relative z-10 flex flex-col gap-4 signin-reveal-d3">
                {[
                  { dot: C.green, text: "Your backlog, exactly as you left it" },
                  { dot: C.cyan, text: "New reviews from curators you follow" },
                  { dot: C.accent, text: "Community discoveries waiting for you" },
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: C.textMuted,
                      letterSpacing: "0.03em",
                    }}
                  >
                    <span
                      className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: item.dot }}
                    />
                    {item.text}
                  </li>
                ))}
              </ul>

              {/* Stats strip */}
              <div
                className="relative z-10 flex gap-8 signin-reveal-d4"
                style={{
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 20,
                  marginTop: 8,
                }}
              >
                {[
                  { val: "10.8k", label: "Titles" },
                  { val: "5.2k", label: "Archivists" },
                  { val: "52k", label: "Records" },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 18, fontWeight: 400, color: C.text, letterSpacing: "0.05em" }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Right panel -- form */}
            <div className="relative flex flex-col gap-8 p-8 sm:p-12" style={{ backgroundColor: C.surface }}>
              <CornerMarkers size={12} />

              {/* Mobile header */}
              <header className="flex flex-col gap-3 lg:hidden signin-reveal-d1">
                <Link
                  href="/"
                  className="tracking-widest transition-opacity hover:opacity-80"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 200,
                    fontSize: 18,
                    color: C.text,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                  }}
                >
                  Binnacle
                </Link>
                <h1
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 200,
                    fontSize: 28,
                    color: C.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Welcome back
                </h1>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>
                  Sign in to access your archive.
                </p>
              </header>

              {/* Desktop header */}
              <div className="hidden lg:block signin-reveal-d1">
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: C.textDim,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  Authenticate
                </div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 200,
                    fontSize: 26,
                    color: C.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Sign in to your archive
                </h2>
              </div>

              <SignIn.Root routing="path" path="/sign-in">
                <SignIn.Step name="start" className="flex flex-col gap-6">
                  {/* OAuth providers */}
                  <div className="flex flex-col gap-3 signin-reveal-d2">
                    <Clerk.Connection name="google" asChild>
                      <button
                        className="auth-btn-social flex w-full items-center justify-center gap-3 rounded-sm px-4 py-3 transition-all duration-200"
                        style={{
                          border: `1px solid ${C.border}`,
                          backgroundColor: C.bgAlt,
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 13,
                          color: C.text,
                          letterSpacing: "0.05em",
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-4 w-4" aria-hidden="true">
                          <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272v95.3h147.5c-6.4 34.5-26.1 63.7-55.6 83.3v68.9h89.8c52.6-48.4 82.8-119.7 82.8-197.1" />
                          <path fill="#34a853" d="M272 544.3c74.9 0 137.7-24.7 183.6-67.3l-89.8-68.9c-24.9 16.7-56.7 26.5-93.8 26.5-71.9 0-132.9-48.6-154.7-114.1H24.9v71.6c45.5 90.2 139.1 152.2 247.1 152.2" />
                          <path fill="#fbbc05" d="M117.3 320.5c-11.2-33.5-11.2-69.7 0-103.2V145.7h-92.4c-39.4 78.8-39.4 171.4 0 250.2z" />
                          <path fill="#ea4335" d="M272 107.7c40.7-.6 79.8 14.9 109.6 43.5l81.6-81.6C421.4 24.6 349.2-1.1 272 0 164.1 0 70.4 62 24.9 152.2l92.4 71.6C139.1 156.3 200.1 107.7 272 107.7" />
                        </svg>
                        Continue with Google
                      </button>
                    </Clerk.Connection>
                    <Clerk.Connection name="discord" asChild>
                      <button
                        className="auth-btn-social flex w-full items-center justify-center gap-3 rounded-sm px-4 py-3 transition-all duration-200"
                        style={{
                          border: `1px solid ${C.border}`,
                          backgroundColor: C.bgAlt,
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 13,
                          color: C.text,
                          letterSpacing: "0.05em",
                        }}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        Continue with Discord
                      </button>
                    </Clerk.Connection>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 signin-reveal-d2">
                    <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />
                    <span
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: C.textDim,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      or
                    </span>
                    <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />
                  </div>

                  {/* Fields */}
                  <div className="flex flex-col gap-4 signin-reveal-d3">
                    <Clerk.Field name="identifier">
                      <Clerk.Label
                        className="mb-1.5 block"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: C.textMuted,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        Email or username
                      </Clerk.Label>
                      <Clerk.Input asChild>
                        <input
                          className={`${fieldClasses} auth-field`}
                          style={{
                            backgroundColor: C.bgAlt,
                            borderColor: C.border,
                            color: C.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                          }}
                          autoComplete="email"
                          placeholder="you@example.com"
                        />
                      </Clerk.Input>
                      <Clerk.FieldError
                        className="mt-1.5 block"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: "#EF4444",
                          letterSpacing: "0.03em",
                        }}
                      />
                    </Clerk.Field>

                    <Clerk.Field name="password">
                      <div className="mb-1.5 flex items-center justify-between">
                        <Clerk.Label
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.textMuted,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Password
                        </Clerk.Label>
                        <SignIn.Action
                          navigate="forgot-password"
                          className="transition-colors duration-200"
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.gold,
                            letterSpacing: "0.05em",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Forgot?
                        </SignIn.Action>
                      </div>
                      <Clerk.Input asChild>
                        <input
                          className={`${fieldClasses} auth-field`}
                          style={{
                            backgroundColor: C.bgAlt,
                            borderColor: C.border,
                            color: C.text,
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                          }}
                          type="password"
                          autoComplete="current-password"
                        />
                      </Clerk.Input>
                      <Clerk.FieldError
                        className="mt-1.5 block"
                        style={{
                          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: "#EF4444",
                          letterSpacing: "0.03em",
                        }}
                      />
                    </Clerk.Field>
                  </div>

                  {/* Submit */}
                  <SignIn.Action submit asChild>
                    <button
                      className="signin-reveal-d4 flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 transition-all duration-200 hover:shadow-lg"
                      style={{
                        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                        fontSize: 13,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        backgroundColor: C.gold,
                        color: "#fff",
                        fontWeight: 400,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: `0 0 24px ${C.bloom}`,
                      }}
                    >
                      Sign In
                    </button>
                  </SignIn.Action>

                  {/* Link to sign-up */}
                  <p
                    className="text-center signin-reveal-d4"
                    style={{
                      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: C.textDim,
                      letterSpacing: "0.03em",
                    }}
                  >
                    Don&apos;t have an account?{" "}
                    <Clerk.Link
                      navigate="sign-up"
                      className="transition-colors duration-200"
                      style={{
                        color: C.gold,
                        cursor: "pointer",
                      }}
                    >
                      Create one
                    </Clerk.Link>
                  </p>
                </SignIn.Step>

                {/* Verification step */}
                <SignIn.Step name="verifications" className="flex flex-col gap-6">
                  <SignIn.Strategy name="email_code">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div
                          className="inline-block self-start"
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.cyan,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            padding: "4px 12px",
                            border: `1px solid ${C.cyanDim}33`,
                            borderRadius: 1,
                            marginBottom: 8,
                          }}
                        >
                          Verification Required
                        </div>
                        <h2
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 200,
                            fontSize: 22,
                            color: C.text,
                          }}
                        >
                          Check your email
                        </h2>
                        <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>
                          Enter the security code we sent to continue.
                        </p>
                      </div>
                      <Clerk.Field name="code">
                        <Clerk.Label
                          className="mb-1.5 block"
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.textMuted,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Verification code
                        </Clerk.Label>
                        <Clerk.Input asChild>
                          <input
                            className={`${fieldClasses} auth-field`}
                            style={{
                              backgroundColor: C.bgAlt,
                              borderColor: C.border,
                              color: C.text,
                              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                              fontSize: 18,
                              letterSpacing: "0.3em",
                              textAlign: "center",
                            }}
                            inputMode="numeric"
                          />
                        </Clerk.Input>
                        <Clerk.FieldError
                          className="mt-1.5 block"
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: "#EF4444",
                          }}
                        />
                      </Clerk.Field>
                      <SignIn.Action submit asChild>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 transition-all duration-200 hover:shadow-lg"
                          style={{
                            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                            fontSize: 13,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            backgroundColor: C.gold,
                            color: "#fff",
                            fontWeight: 400,
                            border: "none",
                            cursor: "pointer",
                            boxShadow: `0 0 24px ${C.bloom}`,
                          }}
                        >
                          Verify and continue
                        </button>
                      </SignIn.Action>
                    </div>
                  </SignIn.Strategy>
                </SignIn.Step>
              </SignIn.Root>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
