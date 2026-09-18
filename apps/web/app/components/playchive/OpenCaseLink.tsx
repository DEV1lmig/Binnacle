"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getHighResCoverUrl } from "@/lib/igdb-images";
import { DEFAULT_TONE, readCoverTone, recallTone } from "@/app/lib/coverColor";
import { useOpenCase } from "./CaseOpening";

/**
 * Opens a case from a cover already on screen: reading its tone is a cache hit,
 * and the case rises from exactly where the cover is. A card whose whole surface
 * is the link uses this with the cover it shows; without a transition provider it
 * is a plain navigation.
 */
export function useOpenFromCover() {
  const open = useOpenCase();
  const router = useRouter();
  return (cover: HTMLElement | null, target: { href: string; gameId?: string; coverUrl?: string | null; title: string }) => {
    if (!open || !cover) { router.push(target.href); return; }
    const img = cover.querySelector("img");
    const tone = (img && img.naturalWidth ? readCoverTone(img) : null) ?? recallTone(target.gameId) ?? DEFAULT_TONE;
    open({ ...target, src: getHighResCoverUrl(target.coverUrl) ?? img?.currentSrc, tone, rect: cover.getBoundingClientRect(), el: cover });
  };
}

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
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);

  // The page should be on its way before the case is even touched: the dive waits
  // for it, and every millisecond saved here is a shorter wait with the lid open.
  const warm = () => router.prefetch(href);

  const openFrom = useOpenFromCover();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const cover = ref.current?.querySelector<HTMLElement>(".pk-cover");
    if (!cover) return;
    event.preventDefault();
    openFrom(cover, { href, gameId, coverUrl, title });
  };

  return (
    <Link ref={ref} href={href} className={className} onClick={handleClick} onPointerEnter={warm} onFocus={warm} {...rest}>
      {children}
    </Link>
  );
}
