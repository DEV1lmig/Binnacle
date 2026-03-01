"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Database, Loader2, Monitor, Moon, Sun, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers, HudDivider } from "@/app/lib/design-primitives";

export default function SettingsProfilePage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const preferences = useQuery(api.settings.getPreferences, currentUser ? {} : "skip");
  const updatePreferences = useMutation(api.settings.updatePreferences);
  const updateUsername = useMutation(api.settings.updateUsername);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  const handleSavePreference = async (key: string, value: string | boolean | string[]) => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      await updatePreferences({ [key]: value });
      setSuccessMessage("Settings saved!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (error) {
      console.error("Failed to save preference:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {successMessage && (
        <div
          className="flex items-center gap-2"
          style={{ padding: "10px 14px", background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 2, marginBottom: 8 }}
        >
          <Check className="w-4 h-4" style={{ color: C.green }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.green }}>{successMessage}</span>
        </div>
      )}

      <AccountSettings currentUser={currentUser} onUpdateUsername={updateUsername} />
      <AppearanceSettings theme={theme} setTheme={setTheme} preferences={preferences} onSave={handleSavePreference} saving={saving} />
      <DataSettings />
    </>
  );
}

function AccountSettings({
  currentUser,
  onUpdateUsername,
}: {
  currentUser: Doc<"users">;
  onUpdateUsername: (args: { username: string }) => Promise<{ success: boolean; username: string }>;
}) {
  const [username, setUsername] = useState(currentUser.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const usernameCheck = useQuery(
    api.settings.checkUsernameAvailable,
    username !== currentUser.username ? { username } : "skip",
  );

  const handleSaveUsername = async () => {
    if (username === currentUser.username) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await onUpdateUsername({ username });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update username";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
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

  return (
    <div className="relative" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}>
      <CornerMarkers size={10} />

      <div className="mb-4">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text, marginBottom: 4 }}>Account</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>Manage your account information</p>
      </div>

      <HudDivider />

      <div className="flex flex-col gap-5 mt-5">
        {/* Display Name (disabled) */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
            Display Name
          </label>
          <input value={currentUser.name} disabled style={{ ...inputStyle, color: C.textDim, cursor: "not-allowed", opacity: 0.6 }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textDim }}>
            Edit your display name from your profile page
          </span>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
            Username
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textDim, fontFamily: FONT_MONO, fontSize: 13 }}>@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                style={{ ...inputStyle, paddingLeft: 28 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={saving || username === currentUser.username || usernameCheck?.available === false}
              style={{
                padding: "10px 18px",
                background: C.gold,
                color: C.bg,
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "none",
                borderRadius: 2,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving || username === currentUser.username || usernameCheck?.available === false ? 0.5 : 1,
                boxShadow: `0 0 12px ${C.bloom}`,
                transition: "all 0.2s",
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : "Save"}
            </button>
          </div>
          {usernameCheck && username !== currentUser.username && (
            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: usernameCheck.available ? C.green : C.red }}>
              {usernameCheck.available ? "Username is available!" : usernameCheck.reason}
            </span>
          )}
          {error && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.red }}>{error}</span>}
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Clerk link */}
        <div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted, marginBottom: 8 }}>
            Manage your email, password, and connected accounts through Clerk.
          </p>
          <button
            onClick={() => window.open("https://accounts.clerk.com", "_blank")}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              color: C.text,
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
            Manage Clerk Account
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings({
  theme,
  setTheme,
  preferences,
  onSave,
  saving,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  preferences: null | { theme?: string; cardView?: string; profileVisibility?: string; showActivityOnFeed?: boolean; showPlayingStatus?: boolean; defaultPlatforms?: string[]; preferredGenres?: string[]; timezone?: string } | undefined;
  onSave: (key: string, value: string | boolean | string[]) => void;
  saving: boolean;
}) {
  const themeOptions = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    onSave("theme", newTheme);
  };

  return (
    <div className="relative" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}>
      <CornerMarkers size={10} />

      <div className="mb-4">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text, marginBottom: 4 }}>Appearance</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>Customize how Binnacle looks for you</p>
      </div>

      <HudDivider />

      <div className="flex flex-col gap-5 mt-5">
        {/* Theme */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  disabled={saving}
                  className="flex flex-col items-center gap-2 py-4"
                  style={{
                    background: isActive ? `${C.gold}12` : "transparent",
                    border: `1px solid ${isActive ? C.gold + "55" : C.border}`,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = C.borderLight; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = C.border; }}
                >
                  <option.icon className="w-5 h-5" style={{ color: isActive ? C.gold : C.textMuted }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em", color: isActive ? C.gold : C.textMuted }}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card View */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
            Card View
          </label>
          <Select
            value={preferences?.cardView ?? "comfortable"}
            onValueChange={(value) => onSave("cardView", value)}
            disabled={saving}
          >
            <SelectTrigger style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 2, color: C.text, fontFamily: FONT_BODY, fontSize: 13 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textDim }}>
            Controls the density of game cards throughout the app
          </span>
        </div>
      </div>
    </div>
  );
}

function DataSettings() {
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    setTimeout(() => {
      alert("Data export feature coming soon!");
      setExporting(false);
    }, 1000);
  };

  return (
    <div className="relative" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24 }}>
      <CornerMarkers size={10} />

      <div className="mb-4">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 200, color: C.text, marginBottom: 4 }}>Data & Export</h2>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>Export or delete your data</p>
      </div>

      <HudDivider />

      <div className="flex flex-col gap-5 mt-5">
        {/* Export */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted }}>
            Export Your Data
          </label>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted }}>
            Download a copy of your reviews, backlog, and favorites in JSON format.
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 self-start"
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              color: C.text,
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.6 : 1,
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Database className="w-4 h-4" /> Export Data</>
            )}
          </button>
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Danger Zone */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: C.red }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.red }}>
              Danger Zone
            </span>
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 300, color: C.textMuted, marginBottom: 12 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => window.open("https://accounts.clerk.com", "_blank")}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${C.red}55`,
              borderRadius: 2,
              color: C.red,
              fontFamily: FONT_MONO,
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${C.red}12`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
