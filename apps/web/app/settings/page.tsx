"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { useTheme } from "next-themes";
import {
    Settings,
    User,
    Palette,
    Shield,
    Database,
    Check,
    Loader2,
    Moon,
    Sun,
    Monitor
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/app/components/ui/card";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";

type TabType = "account" | "appearance" | "privacy" | "data";

export default function SettingsPage() {
    const { currentUser, isLoading: isUserLoading } = useCurrentUser();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabType>("account");

    const preferences = useQuery(
        api.settings.getPreferences,
        currentUser ? {} : "skip"
    );
    const updatePreferences = useMutation(api.settings.updatePreferences);
    const privacySettings = useQuery(
        api.privacy.getSettings,
        currentUser ? {} : "skip"
    );
    const updatePrivacySettings = useMutation(api.privacy.updateSettings);
    const updateUsername = useMutation(api.settings.updateUsername);
    const checkUsername = useQuery(
        api.settings.checkUsernameAvailable,
        currentUser ? { username: "" } : "skip"
    );

    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Show skeleton while loading
    if (isUserLoading || !currentUser) {
        return <FeedPageSkeleton />;
    }

    const handleSavePreference = async (
        key: string,
        value: string | boolean | string[]
    ) => {
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

    const handleSavePrivacy = async (patch: {
        profileVisibility?: "public" | "friends" | "private";
        backlogVisibility?: "public" | "friends" | "private";
        reviewsVisibility?: "public" | "friends" | "private";
        activityVisibility?: "public" | "friends" | "private";
        showStats?: boolean;
        allowFriendRequests?: "everyone" | "friends_of_friends" | "nobody";
        showOnlineStatus?: boolean;
    }) => {
        setSaving(true);
        setSuccessMessage(null);
        try {
            await updatePrivacySettings(patch);
            setSuccessMessage("Settings saved!");
            setTimeout(() => setSuccessMessage(null), 2000);
        } catch (error) {
            console.error("Failed to save privacy settings:", error);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "account" as const, label: "Account", icon: User },
        { id: "appearance" as const, label: "Appearance", icon: Palette },
        { id: "privacy" as const, label: "Privacy", icon: Shield },
        { id: "data" as const, label: "Data & Export", icon: Database },
    ];

    return (
        <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
            <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
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

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-4 p-3 bg-[var(--bkl-color-feedback-success)]/20 border border-[var(--bkl-color-feedback-success)] rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-[var(--bkl-color-feedback-success)]" />
                        <span className="text-[var(--bkl-color-feedback-success)] text-sm">
                            {successMessage}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${activeTab === tab.id
                                            ? "bg-[var(--bkl-color-accent-primary)]/20 text-[var(--bkl-color-accent-primary)] border border-[var(--bkl-color-accent-primary)]/30"
                                            : "text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-bg-secondary)] hover:text-[var(--bkl-color-text-primary)]"
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}>
                                        {tab.label}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="md:col-span-3 space-y-6">
                        {activeTab === "account" && (
                            <AccountSettings
                                currentUser={currentUser}
                                onUpdateUsername={updateUsername}
                            />
                        )}

                        {activeTab === "appearance" && (
                            <AppearanceSettings
                                theme={theme}
                                setTheme={setTheme}
                                preferences={preferences}
                                onSave={handleSavePreference}
                                saving={saving}
                            />
                        )}

                        {activeTab === "privacy" && (
                            <PrivacySettings
                                privacySettings={privacySettings}
                                onSave={handleSavePrivacy}
                                saving={saving}
                            />
                        )}

                        {activeTab === "data" && <DataSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// === Account Settings Component ===
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
        username !== currentUser.username ? { username } : "skip"
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
                <CardTitle className="text-[var(--bkl-color-text-primary)]">
                    Account Settings
                </CardTitle>
                <CardDescription className="text-[var(--bkl-color-text-secondary)]">
                    Manage your account information
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                    <Label className="text-[var(--bkl-color-text-primary)]">
                        Display Name
                    </Label>
                    <Input
                        value={currentUser.name}
                        disabled
                        className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-disabled)]"
                    />
                    <p className="text-xs text-[var(--bkl-color-text-disabled)]">
                        Edit your display name from your profile page
                    </p>
                </div>

                {/* Username */}
                <div className="space-y-2">
                    <Label className="text-[var(--bkl-color-text-primary)]">
                        Username
                    </Label>
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
                            disabled={saving || username === currentUser.username || usernameCheck?.available === false}
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
                        <p className={`text-xs ${usernameCheck.available ? "text-[var(--bkl-color-feedback-success)]" : "text-[var(--bkl-color-feedback-error)]"}`}>
                            {usernameCheck.available ? "Username is available!" : usernameCheck.reason}
                        </p>
                    )}
                    {error && (
                        <p className="text-xs text-[var(--bkl-color-feedback-error)]">{error}</p>
                    )}
                </div>

                {/* Clerk Account Link */}
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

// === Appearance Settings Component ===
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
                <CardTitle className="text-[var(--bkl-color-text-primary)]">
                    Appearance
                </CardTitle>
                <CardDescription className="text-[var(--bkl-color-text-secondary)]">
                    Customize how Binnacle looks for you
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                    <Label className="text-[var(--bkl-color-text-primary)]">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {themeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleThemeChange(option.value)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${theme === option.value
                                        ? "border-[var(--bkl-color-accent-primary)] bg-[var(--bkl-color-accent-primary)]/10"
                                        : "border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-text-disabled)]"
                                    }`}
                            >
                                <option.icon className={`w-6 h-6 ${theme === option.value ? "text-[var(--bkl-color-accent-primary)]" : "text-[var(--bkl-color-text-secondary)]"}`} />
                                <span className={`text-sm ${theme === option.value ? "text-[var(--bkl-color-accent-primary)]" : "text-[var(--bkl-color-text-secondary)]"}`}>
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card View Preference */}
                <div className="space-y-3">
                    <Label className="text-[var(--bkl-color-text-primary)]">
                        Card View
                    </Label>
                    <Select
                        value={preferences?.cardView ?? "comfortable"}
                        onValueChange={(value) => onSave("cardView", value)}
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

// === Privacy Settings Component ===
function PrivacySettings({
    privacySettings,
    onSave,
    saving,
}: {
    privacySettings: any;
    onSave: (patch: {
        profileVisibility?: "public" | "friends" | "private";
        backlogVisibility?: "public" | "friends" | "private";
        reviewsVisibility?: "public" | "friends" | "private";
        activityVisibility?: "public" | "friends" | "private";
        showStats?: boolean;
        allowFriendRequests?: "everyone" | "friends_of_friends" | "nobody";
        showOnlineStatus?: boolean;
    }) => void;
    saving: boolean;
}) {
    return (
        <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardHeader>
                <CardTitle className="text-[var(--bkl-color-text-primary)]">
                    Privacy Settings
                </CardTitle>
                <CardDescription className="text-[var(--bkl-color-text-secondary)]">
                    Control who can see your activity
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Profile Visibility */}
                <div className="space-y-3">
                    <Label className="text-[var(--bkl-color-text-primary)]">
                        Profile Visibility
                    </Label>
                    <Select
                        value={privacySettings?.profileVisibility ?? "public"}
                        onValueChange={(value) =>
                            onSave({
                                profileVisibility: value as "public" | "friends" | "private",
                            })
                        }
                    >
                        <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">Public - Anyone can view</SelectItem>
                            <SelectItem value="friends">Friends Only</SelectItem>
                            <SelectItem value="private">Private - Only you</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Activity Feed Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-[var(--bkl-color-text-primary)]">
                            Show Activity on Feed
                        </Label>
                        <p className="text-xs text-[var(--bkl-color-text-disabled)]">
                            Your reviews and updates appear on followers&apos; feeds
                        </p>
                    </div>
                    <Switch
                        checked={(privacySettings?.activityVisibility ?? "public") !== "private"}
                        onCheckedChange={(checked) =>
                            onSave({ activityVisibility: checked ? "public" : "private" })
                        }
                    />
                </div>

                {/* Playing Status Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-[var(--bkl-color-text-primary)]">
                            Show &quot;Currently Playing&quot; Status
                        </Label>
                        <p className="text-xs text-[var(--bkl-color-text-disabled)]">
                            Others can see what games you&apos;re currently playing
                        </p>
                    </div>
                    <Switch
                        checked={(privacySettings?.backlogVisibility ?? "public") !== "private"}
                        onCheckedChange={(checked) =>
                            onSave({ backlogVisibility: checked ? "public" : "private" })
                        }
                    />
                </div>
            </CardContent>
        </Card>
    );
}

// === Data Settings Component ===
function DataSettings() {
    const [exporting, setExporting] = useState(false);

    const handleExportData = async () => {
        setExporting(true);
        // TODO: Implement data export
        setTimeout(() => {
            alert("Data export feature coming soon!");
            setExporting(false);
        }, 1000);
    };

    return (
        <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardHeader>
                <CardTitle className="text-[var(--bkl-color-text-primary)]">
                    Data & Export
                </CardTitle>
                <CardDescription className="text-[var(--bkl-color-text-secondary)]">
                    Export or delete your data
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Export Data */}
                <div className="space-y-3">
                    <Label className="text-[var(--bkl-color-text-primary)]">
                        Export Your Data
                    </Label>
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

                {/* Delete Account */}
                <div className="pt-4 border-t border-[var(--bkl-color-border)]">
                    <Label className="text-[var(--bkl-color-feedback-error)]">
                        Danger Zone
                    </Label>
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
