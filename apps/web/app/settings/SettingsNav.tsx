"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Shield, User, UserX } from "lucide-react";

const navItems = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/blocked", label: "Blocked", icon: UserX },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
              isActive
                ? "bg-[var(--bkl-color-accent-primary)]/20 text-[var(--bkl-color-accent-primary)] border border-[var(--bkl-color-accent-primary)]/30"
                : "text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-bg-secondary)] hover:text-[var(--bkl-color-text-primary)]"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span
              style={{
                fontSize: "var(--bkl-font-size-sm)",
                fontWeight: "var(--bkl-font-weight-medium)",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
