"use client";

import { SignIn } from "@clerk/nextjs";

export default function AdminSignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-[var(--bkl-color-text-primary)]">Admin sign in</h1>
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">
              Sign in to access the moderation dashboard.
            </p>
          </div>
          <SignIn routing="path" path="/admin/sign-in" afterSignInUrl="/admin" />
        </div>
      </div>
    </div>
  );
}
