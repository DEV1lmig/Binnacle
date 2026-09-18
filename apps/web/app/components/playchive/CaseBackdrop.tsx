"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_TONE, recallTone, type CoverTone } from "@/app/lib/coverColor";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { textureUrl } from "./case3d/caseArt";
import { registerCase } from "./case3d/store";

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
 * The open case, seen from above, resting on a dark surface: the tray leaned back so
 * its far edge recedes and its near edge comes forward, its walls catching the light,
 * the spine running along the far edge where the lid folds away out of frame, and
 * the cover's artwork fading into the moulded plastic like a print left in the tray.
 *
 * This is the DOM version. Where the 3D stage runs, it registers its tray as the
 * case the page rests in, the stage draws the real case there — the same one that
 * just opened, still moving — and this fades out underneath. Without WebGL, or with
 * reduced motion, this is what the reader sees. Colours come from `toneVars` on an
 * ancestor.
 */
export function CaseInside({ src, gameId, title }: { src?: string | null; gameId?: string; title?: string }) {
  const url = printUrl(src);
  const tray = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tray.current;
    if (!el || !gameId) return;
    return registerCase({ el, coverUrl: url, title: title ?? "", gameId, open: true });
  }, [url, gameId, title]);

  return (
    <div ref={tray} className="pk-case-open pk-case-inside">
      <span className="pk-case-ribs" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img className="pk-case-print" src={url} alt="" draggable={false} /> : null}
      <span className="pk-case-sheen" />
      <span className="pk-case-vignette" />
      <span className="pk-case-rim" />
      <span className="pk-case-hinge"><i className="pk-case-mark" />playchive</span>
    </div>
  );
}

/** A detail page's background: the reader is looking down into the open case. */
export function CaseBackdrop({ src, gameId, title }: { src?: string | null; gameId?: string; title?: string }) {
  return (
    <div className="pk-case-backdrop pk-case-view" aria-hidden="true">
      <CaseInside src={src} gameId={gameId} title={title} />
    </div>
  );
}
