"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_TONE, recallTone, type CoverTone } from "@/app/lib/coverColor";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { buildCase, placeBox, trayRect } from "./caseBox";
import { textureUrl } from "./caseUrl";

/**
 * Tone for a detail page. Starts from what the case remembered when it was opened,
 * so the first paint is already tinted, and is refined once the page's own cover
 * decodes (direct visits, reloads, shared links).
 */
export function useCaseTone(gameId?: string): [CoverTone, (tone: CoverTone) => void] {
  const [tone, setTone] = useState<CoverTone>(() => recallTone(gameId) ?? DEFAULT_TONE);
  return [tone, setTone];
}

/** A cover URL good enough to fill a page with, same-origin like every other cover. */
export function printUrl(src?: string | null) {
  const url = getStandardCoverUrl(src);
  if (!url) return undefined;
  return url.includes("/_next/image") ? url : textureUrl(url, 828);
}

/**
 * The open case a detail page rests in, seen from above on a dark surface: the tray
 * leaned back so its far edge recedes and its near edge comes forward, the lid
 * folded away out of frame on the left, and the cover's artwork fading into the
 * moulded plastic like a print left in the tray.
 *
 * Built with the same planes as the case that flies in from the shelf, at exactly
 * the pose that flight ends in, so the hand-over is invisible. The tone comes from
 * `toneVars` on the page. The data attributes let the case be picked up again when
 * the reader goes back.
 */
export function CaseInside({ src, gameId, title }: { src?: string | null; gameId?: string; title?: string }) {
  const url = printUrl(src);
  const view = useRef<HTMLDivElement>(null);
  const [tone] = useCaseTone(gameId);

  useEffect(() => {
    const host = view.current;
    if (!host) return;
    const size = () => ({ width: host.clientWidth, height: host.clientHeight });
    const { floor, shell } = buildCase({ print: url, front: url, title: title ?? "", tone }, trayRect(size()), size());
    // The page's own tone is inherited through the wrapper; the built-in one steps aside.
    for (const box of [floor, shell]) for (const name of Array.from(box.style)) if (name.startsWith("--case-")) box.style.removeProperty(name);
    host.append(floor, shell);
    const fit = () => { for (const box of [floor, shell]) placeBox(box, trayRect(size()), size()); };
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      floor.remove();
      shell.remove();
    };
    // Tone is painted by CSS variables on the page, so it never needs a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, title]);

  return <div ref={view} className="pk-case-view pk-case-rest" data-game-id={gameId} data-title={title} data-print={url} />;
}

/** A detail page's background: the reader is looking down into the open case. */
export function CaseBackdrop({ src, gameId, title }: { src?: string | null; gameId?: string; title?: string }) {
  return (
    <div className="pk-case-backdrop" aria-hidden="true">
      <CaseInside src={src} gameId={gameId} title={title} />
    </div>
  );
}
