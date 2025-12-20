"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface AdminGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

/**
 * Protects admin routes by checking user role.
 * Shows loading state, access denied, or bootstrap option.
 */
export function AdminGuard({ 
  children, 
  requireAdmin = true,
  requireModerator = false 
}: AdminGuardProps) {
  const router = useRouter();
  const roleInfo = useQuery(api.admin.getCurrentUserRole);
  const needsSetup = useQuery(api.admin.needsAdminSetup);
  const bootstrapAdmin = useMutation(api.admin.bootstrapAdmin);

  // Loading state
  if (roleInfo === undefined || needsSetup === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bkl-color-accent-primary)]" />
          <p className="text-[var(--bkl-color-text-secondary)]">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!roleInfo.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-8 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--bkl-color-text-primary)] mb-2">
            Authentication Required
          </h1>
          <p className="text-[var(--bkl-color-text-secondary)] mb-6">
            Please sign in to access the admin panel.
          </p>
          <Button
            onClick={() => router.push("/sign-in")}
            className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Bootstrap mode - no admins exist yet
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-8 max-w-md text-center">
          <ShieldCheck className="w-16 h-16 text-[var(--bkl-color-accent-primary)] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--bkl-color-text-primary)] mb-2">
            Admin Setup Required
          </h1>
          <p className="text-[var(--bkl-color-text-secondary)] mb-6">
            No administrators exist yet. As the first user accessing this panel, 
            you can become the initial admin.
          </p>
          <Button
            onClick={async () => {
              try {
                await bootstrapAdmin({});
                // Refresh the page to update role info
                window.location.reload();
              } catch (error) {
                console.error("Failed to bootstrap admin:", error);
                alert("Failed to become admin. Please try again.");
              }
            }}
            className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
          >
            Become Admin
          </Button>
        </div>
      </div>
    );
  }

  // Check permissions based on requirements
  const hasAccess = requireAdmin 
    ? roleInfo.isAdmin 
    : requireModerator 
      ? roleInfo.isModerator 
      : true;

  // Access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-8 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--bkl-color-text-primary)] mb-2">
            Access Denied
          </h1>
          <p className="text-[var(--bkl-color-text-secondary)] mb-2">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-[var(--bkl-color-text-disabled)] text-sm mb-6">
            Required role: {requireAdmin ? "Admin" : "Moderator"}<br />
            Your role: {roleInfo.role}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-[var(--bkl-color-border)]"
            >
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
            >
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Access granted - render children
  return <>{children}</>;
}
