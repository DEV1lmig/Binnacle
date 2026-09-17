"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type PillTone = "cobalt" | "gold" | "ink" | "white" | "ghost" | "orange";
type PillSize = "sm" | "md" | "lg";

type Common = { tone?: PillTone; size?: PillSize; children: ReactNode; className?: string };
type ButtonPill = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkPill = Common & { href: string; prefetch?: boolean; "aria-label"?: string };

/** Landing-style pill with the wipe hover. Renders a Link when `href` is given. */
export function Pill(props: ButtonPill | LinkPill) {
  const { tone = "cobalt", size = "md", className = "", children } = props;
  const shared = { className: `pk-pill ${className}`, "data-tone": tone, "data-size": size };
  if ("href" in props && props.href) {
    const { href, prefetch, ...rest } = props as LinkPill;
    return <Link href={href} prefetch={prefetch} aria-label={rest["aria-label"]} {...shared}>{children}</Link>;
  }
  const { tone: _t, size: _s, className: _c, children: _ch, ...rest } = props as ButtonPill;
  void _t; void _s; void _c; void _ch;
  return <button type="button" {...rest} {...shared}>{children}</button>;
}
