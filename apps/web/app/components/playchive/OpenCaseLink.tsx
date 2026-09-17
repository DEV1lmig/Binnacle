"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { DEFAULT_TONE, readCoverTone, recallTone } from "@/app/lib/coverColor";
import { useOpenCase } from "./CaseOpening";

/**
 * Wraps a case so that activating it plays the opening animation before the page
 * changes. Stays an anchor: middle-click, modifier-click and "open in new tab" all
 * behave normally, and without JavaScript it is still a plain link.
 */
export function OpenCaseLink({ href, gameId, coverUrl, title, className = "", children, ...rest }: {
  href: string;
  gameId?: string;
  coverUrl?: string | null;
  title: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const open = useOpenCase();
  const ref = useRef<HTMLAnchorElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!open || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const cover = ref.current?.querySelector<HTMLElement>(".pk-cover");
    if (!cover) return;
    event.preventDefault();
    // The cover is already decoded on screen, so reading its tone here is a cache hit.
    const img = cover.querySelector("img");
    const tone = (img && img.naturalWidth ? readCoverTone(img) : null) ?? recallTone(gameId) ?? DEFAULT_TONE;
    open({ href, gameId, title, src: getStandardCoverUrl(coverUrl) ?? img?.currentSrc, tone, rect: cover.getBoundingClientRect(), el: cover });
  };

  return (
    <Link ref={ref} href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
