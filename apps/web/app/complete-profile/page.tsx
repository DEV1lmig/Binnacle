"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay, HudBadge } from "@/app/lib/design-primitives";
import { Loader2 } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: C.bgAlt,
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  color: C.text,
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s",
};

export default function CompleteProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const syncCurrentUser = useMutation(api.users.syncCurrent);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [isLoaded, router, user]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
        <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.gold }} />
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", color: C.textMuted }}>
            LOADING PROFILE...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
        <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>Redirecting...</p>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorMessage("Please provide both a first and last name before continuing.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await user.update({ firstName: trimmedFirst, lastName: trimmedLast });
      await syncCurrentUser({});
      router.replace("/feed");
    } catch (error) {
      console.error("Failed to update profile", error);
      setErrorMessage("We could not save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace("/feed");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16" style={{ background: C.bg }}>
      <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
      <GrainOverlay id="profile-setup-grain" />

      {/* Ambient orbs */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: -120, left: -120, width: 400, height: 400,
          background: `radial-gradient(circle, ${C.gold}15 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none fixed"
        style={{
          bottom: -120, right: -120, width: 400, height: 400,
          background: `radial-gradient(circle, ${C.accent}12 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative w-full max-w-xl p-10"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
        }}
      >
        <CornerMarkers size={14} />

        <header className="mb-8 flex flex-col gap-3">
          <HudBadge color={C.gold}>Profile Setup</HudBadge>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 200, color: C.text, letterSpacing: "-0.01em" }}>
            Double-check your name
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted, lineHeight: 1.6 }}>
            Some providers skip name entry during quick sign up. Take a moment to set how your crew will see you.
          </p>
        </header>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="firstName"
              style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}
            >
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              style={inputStyle}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isSubmitting}
              onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="lastName"
              style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}
            >
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              style={inputStyle}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isSubmitting}
              onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
            />
          </div>

          {errorMessage && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.red }}>{errorMessage}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: C.gold,
                color: C.bg,
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "none",
                borderRadius: 2,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: `0 0 20px ${C.bloom}`,
                transition: "all 0.2s",
              }}
            >
              {isSubmitting ? "Saving..." : "Save and continue"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: C.textMuted,
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 300,
                letterSpacing: "0.06em",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
