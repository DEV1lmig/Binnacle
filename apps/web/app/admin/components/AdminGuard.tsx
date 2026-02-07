"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

interface AdminGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? C.gold : C.border}`,
        borderRadius: 2,
        background: "transparent",
        color: hovered ? C.text : C.textMuted,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "8px 20px",
        cursor: "pointer",
        transition: "border-color 0.2s, color 0.2s, box-shadow 0.2s",
        boxShadow: hovered ? `0 0 12px ${C.bloom}` : "none",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: "none",
        borderRadius: 2,
        background: C.gold,
        color: C.bg,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 500,
        padding: "8px 20px",
        cursor: "pointer",
        transition: "opacity 0.2s, box-shadow 0.2s",
        opacity: hovered ? 0.9 : 1,
        boxShadow: hovered
          ? `0 0 24px ${C.bloom}`
          : `0 0 16px ${C.bloom}`,
      }}
    >
      {children}
    </button>
  );
}

function GuardShell({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: C.bg }}
    >
      <style>{`@import url('${FONT_IMPORT_URL}');`}</style>
      <GrainOverlay id="admin-guard-grain" />

      {/* Ambient orbs */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: 400,
          height: 400,
          top: -100,
          left: -100,
          background: `radial-gradient(circle, ${C.gold}15 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          width: 350,
          height: 350,
          bottom: -80,
          right: -80,
          background: `radial-gradient(circle, ${C.accent}12 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative max-w-md w-full mx-4 text-center"
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          background: C.surface,
          padding: "40px 32px",
        }}
      >
        <CornerMarkers size={10} />

        {/* Scan line */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${iconColor}44, transparent)`,
          }}
        />

        <div style={{ color: iconColor, marginBottom: 20 }}>
          {icon}
        </div>

        <h1
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 22,
            fontWeight: 200,
            color: C.text,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>

        {children}
      </div>
    </div>
  );
}

export function AdminGuard({
  children,
  requireAdmin = true,
  requireModerator = false,
}: AdminGuardProps) {
  const router = useRouter();
  const roleInfo = useQuery(api.admin.getCurrentUserRole);
  const needsSetup = useQuery(api.admin.needsAdminSetup);
  const bootstrapAdmin = useMutation(api.admin.bootstrapAdmin);

  useEffect(() => {
    if (roleInfo && !roleInfo.isAuthenticated) {
      router.replace("/admin/sign-in");
    }
  }, [roleInfo, router]);

  // Loading
  if (roleInfo === undefined || needsSetup === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: C.bg }}
      >
        <style>{`@import url('${FONT_IMPORT_URL}');`}</style>
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="animate-spin"
            style={{ width: 32, height: 32, color: C.gold }}
          />
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.textMuted,
            }}
          >
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!roleInfo.isAuthenticated) {
    return (
      <GuardShell
        icon={<ShieldAlert style={{ width: 48, height: 48, margin: "0 auto" }} />}
        iconColor={C.red}
        title="Authentication Required"
      >
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            marginBottom: 24,
          }}
        >
          Please sign in to access the admin panel.
        </p>
        <PrimaryButton onClick={() => router.push("/admin/sign-in")}>
          Sign In
        </PrimaryButton>
      </GuardShell>
    );
  }

  // Bootstrap -- no admins exist
  if (needsSetup) {
    return (
      <GuardShell
        icon={<ShieldCheck style={{ width: 48, height: 48, margin: "0 auto" }} />}
        iconColor={C.green}
        title="Admin Setup Required"
      >
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          No administrators exist yet. As the first user accessing this panel,
          you can become the initial admin.
        </p>
        <PrimaryButton
          onClick={async () => {
            try {
              await bootstrapAdmin({});
              window.location.reload();
            } catch (error) {
              console.error("Failed to bootstrap admin:", error);
              alert("Failed to become admin. Please try again.");
            }
          }}
        >
          Become Admin
        </PrimaryButton>
      </GuardShell>
    );
  }

  // Permission check
  const hasAccess = requireAdmin
    ? roleInfo.isAdmin
    : requireModerator
      ? roleInfo.isModerator
      : true;

  // Access denied
  if (!hasAccess) {
    return (
      <GuardShell
        icon={<ShieldAlert style={{ width: 48, height: 48, margin: "0 auto" }} />}
        iconColor={C.red}
        title="Access Denied"
      >
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            marginBottom: 8,
          }}
        >
          You don&apos;t have permission to access this page.
        </p>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.textDim,
            marginBottom: 24,
          }}
        >
          Required: {requireAdmin ? "Admin" : "Moderator"} &middot; Current: {roleInfo.role}
        </p>
        <div className="flex gap-3 justify-center">
          <GhostButton onClick={() => router.back()}>Go Back</GhostButton>
          <PrimaryButton onClick={() => router.push("/")}>Home</PrimaryButton>
        </div>
      </GuardShell>
    );
  }

  return <>{children}</>;
}
