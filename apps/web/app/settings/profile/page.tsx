"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Database, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

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
        <div className="mb-4 p-3 bg-[var(--bkl-color-feedback-success)]/20 border border-[var(--bkl-color-feedback-success)] rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--bkl-color-feedback-success)]" />
          <span className="text-[var(--bkl-color-feedback-success)] text-sm">{successMessage}</span>
        </div>
      )}

      <AccountSettings currentUser={currentUser} onUpdateUsername={updateUsername} />

      <AppearanceSettings
        theme={theme}
        setTheme={setTheme}
        preferences={preferences}
        onSave={handleSavePreference}
        saving={saving}
      />

      <DataSettings />
    </>
  );
}

function AccountSettings({
  currentUser,
  onUpdateUsername,
}: {
  currentUser: any;
  onUpdateUsername: any;
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
    } catch (err: any) {
      setError(err.message || "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--bkl-color-text-primary)]">Account</CardTitle>
        <CardDescription className="text-[var(--bkl-color-text-secondary)]">
          Manage your account information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[var(--bkl-color-text-primary)]">Display Name</Label>
          <Input
            value={currentUser.name}
            disabled
            className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-disabled)]"
          />
          <p className="text-xs text-[var(--bkl-color-text-disabled)]">
            Edit your display name from your profile page
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[var(--bkl-color-text-primary)]">Username</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bkl-color-text-disabled)]">
                @
              </span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="pl-8 bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
              />
            </div>
            <Button
              onClick={handleSaveUsername}
              disabled={
                saving ||
                username === currentUser.username ||
                usernameCheck?.available === false
              }
              className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : success ? (
                <Check className="w-4 h-4" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {usernameCheck && username !== currentUser.username && (
            <p
              className={`text-xs ${
                usernameCheck.available
                  ? "text-[var(--bkl-color-feedback-success)]"
                  : "text-[var(--bkl-color-feedback-error)]"
              }`}
            >
              {usernameCheck.available ? "Username is available!" : usernameCheck.reason}
            </p>
          )}
          {error && <p className="text-xs text-[var(--bkl-color-feedback-error)]">{error}</p>}
        </div>

        <div className="pt-4 border-t border-[var(--bkl-color-border)]">
          <p className="text-sm text-[var(--bkl-color-text-secondary)] mb-2">
            Manage your email, password, and connected accounts through Clerk.
          </p>
          <Button
            variant="outline"
            className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
            onClick={() => window.open("https://accounts.clerk.com", "_blank")}
          >
            Manage Clerk Account
          </Button>
        </div>
      </CardContent>
    </Card>
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
  preferences: any;
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
    <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--bkl-color-text-primary)]">Appearance</CardTitle>
        <CardDescription className="text-[var(--bkl-color-text-secondary)]">
          Customize how Binnacle looks for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-[var(--bkl-color-text-primary)]">Theme</Label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  theme === option.value
                    ? "border-[var(--bkl-color-accent-primary)] bg-[var(--bkl-color-accent-primary)]/10"
                    : "border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-text-disabled)]"
                }`}
              >
                <option.icon
                  className={`w-6 h-6 ${
                    theme === option.value
                      ? "text-[var(--bkl-color-accent-primary)]"
                      : "text-[var(--bkl-color-text-secondary)]"
                  }`}
                />
                <span
                  className={`text-sm ${
                    theme === option.value
                      ? "text-[var(--bkl-color-accent-primary)]"
                      : "text-[var(--bkl-color-text-secondary)]"
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[var(--bkl-color-text-primary)]">Card View</Label>
          <Select
            value={preferences?.cardView ?? "comfortable"}
            onValueChange={(value) => onSave("cardView", value)}
            disabled={saving}
          >
            <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[var(--bkl-color-text-disabled)]">
            Controls the density of game cards throughout the app
          </p>
        </div>
      </CardContent>
    </Card>
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
    <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--bkl-color-text-primary)]">Data & Export</CardTitle>
        <CardDescription className="text-[var(--bkl-color-text-secondary)]">
          Export or delete your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-[var(--bkl-color-text-primary)]">Export Your Data</Label>
          <p className="text-sm text-[var(--bkl-color-text-secondary)]">
            Download a copy of your reviews, backlog, and favorites in JSON format.
          </p>
          <Button
            onClick={handleExportData}
            disabled={exporting}
            variant="outline"
            className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Export Data
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t border-[var(--bkl-color-border)]">
          <Label className="text-[var(--bkl-color-feedback-error)]">Danger Zone</Label>
          <p className="text-sm text-[var(--bkl-color-text-secondary)] mt-2 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            className="border-[var(--bkl-color-feedback-error)] text-[var(--bkl-color-feedback-error)] hover:bg-[var(--bkl-color-feedback-error)]/10"
            onClick={() => window.open("https://accounts.clerk.com", "_blank")}
          >
            Delete Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
