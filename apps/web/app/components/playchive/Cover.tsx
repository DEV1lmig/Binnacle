"use client";

import Image from "next/image";
import { useState, type SyntheticEvent } from "react";
import { getHighResCoverUrl } from "@/lib/igdb-images";
import { DEFAULT_TONE, readCoverTone, recallTone, rememberTone, type CoverTone } from "@/app/lib/coverColor";

/**
 * A game cover drawn as a physical case, with the same anatomy as the landing's
 * 3D shelf: a branded band across the top, a spine down the left edge and plastic
 * depth. The band takes the cover's own dominant colour, which is also what tints
 * the detail page when the case opens.
 *
 * The band and the art offset only appear once the case is wide enough to read
 * them; at row size (≈56px) it stays a plain cover.
 */
export function Cover({ src, title, tilt = true, className = "", sizes = "160px", priority, gameId, onTone }: {
  src?: string | null;
  title: string;
  tilt?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Game id: lets the case remember its tone for the page it opens into. */
  gameId?: string;
  onTone?: (tone: CoverTone) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [tone, setTone] = useState<CoverTone>(() => recallTone(gameId) ?? DEFAULT_TONE);
  // The 720p master: Next resizes it for the slot, so a retina grid never upscales the 264px IGDB default.
  const url = getHighResCoverUrl(src);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const next = readCoverTone(event.currentTarget, url);
    setTone(next);
    if (gameId) rememberTone(gameId, next);
    onTone?.(next);
  };

  return (
    <span
      className={`pk-cover ${className}`}
      data-tilt={tilt || undefined}
      data-case="true"
      data-game-id={gameId}
      style={{ "--case-tint": tone.tint, "--case-ink": tone.ink } as React.CSSProperties}
    >
      {url && !failed
        ? <Image src={url} alt="" fill sizes={sizes} priority={priority} onLoad={handleLoad} onError={() => setFailed(true)} />
        : <span className="pk-cover-empty" aria-hidden="true">{title}</span>}
      <span className="pk-case-band" aria-hidden="true"><i className="pk-case-mark" />playchive</span>
      <span className="pk-case-spine" aria-hidden="true" />
      <span className="pk-case-gloss" aria-hidden="true" />
    </span>
  );
}
