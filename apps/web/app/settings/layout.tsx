import type { ReactNode } from "react";

import { Settings } from "lucide-react";

import { SettingsNav } from "./SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[var(--bkl-color-accent-primary)]" />
            <h1
              className="text-[var(--bkl-color-text-primary)]"
              style={{
                fontSize: "var(--bkl-font-size-4xl)",
                fontWeight: "var(--bkl-font-weight-bold)",
              }}
            >
              Settings
            </h1>
          </div>
          <p
            className="text-[var(--bkl-color-text-secondary)]"
            style={{ fontSize: "var(--bkl-font-size-base)" }}
          >
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <SettingsNav />
          </div>

          <div className="md:col-span-3 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
