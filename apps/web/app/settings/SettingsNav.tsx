"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Shield, User, UserX } from "lucide-react";
import { C, FONT_MONO } from "@/app/lib/design-system";

const navItems = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/blocked", label: "Blocked", icon: UserX },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 no-underline"
            style={{
              borderRadius: 2,
              transition: "all 0.2s",
              background: isActive ? `${C.gold}15` : "transparent",
              border: isActive ? `1px solid ${C.gold}33` : "1px solid transparent",
              color: isActive ? C.gold : C.textMuted,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = C.surface;
                e.currentTarget.style.color = C.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.textMuted;
              }
            }}
          >
            <Icon className="w-4 h-4" />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
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
