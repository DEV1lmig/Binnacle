"use client";

import Image from "next/image";
import { useState, type SyntheticEvent } from "react";
import { getHighResCoverUrl } from "@/lib/igdb-images";
import { DEFAULT_TONE, readCoverTone, recallTone, rememberTone, type CoverTone } from "@/app/lib/coverColor";
import type { Medium } from "@/app/lib/medium";

/**
 * A game cover drawn as the thing it came on. By default a physical case, with
 * the same anatomy as the landing's 3D shelf: a branded band across the top, a
 * spine down the left edge and plastic depth. Given a `medium`, the cartridge or
 * cassette of the game's original platform instead, with the artwork as its
 * label, drawn inside the same 2:3 slot so shelves keep their rhythm.
 *
 * The band takes the cover's own dominant colour, which is also what tints the
 * detail page when the case opens. The band and the art offset only appear once
 * the case is wide enough to read them; at row size (≈56px) it stays a plain cover.
 */
export function Cover({ src, title, tilt = true, className = "", sizes = "160px", priority, gameId, onTone, medium = "case" }: {
  src?: string | null;
  title: string;
  tilt?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Game id: lets the case remember its tone for the page it opens into. */
  gameId?: string;
  onTone?: (tone: CoverTone) => void;
  medium?: Medium;
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

  const art = url && !failed
    ? <Image src={url} alt="" fill sizes={sizes} priority={priority} onLoad={handleLoad} onError={() => setFailed(true)} />
    : <span className="pk-cover-empty" aria-hidden="true">{title}</span>;
  const style = { "--case-tint": tone.tint, "--case-ink": tone.ink } as React.CSSProperties;

  if (medium !== "case") {
    return (
      <span className={`pk-cover ${className}`} data-tilt={tilt || undefined} data-medium={medium} data-game-id={gameId} style={style}>
        <span className="pk-cart" aria-hidden="true">
          <span className="pk-cart-grip" />
          <span className="pk-cart-label">{art}</span>
          <span className="pk-cart-brand"><i className="pk-case-mark" />playchive</span>
          <span className="pk-cart-gloss" />
        </span>
      </span>
    );
  }

  return (
    <span className={`pk-cover ${className}`} data-tilt={tilt || undefined} data-case="true" data-medium="case" data-game-id={gameId} style={style}>
      {art}
      <span className="pk-case-band" aria-hidden="true"><i className="pk-case-mark" />playchive</span>
      <span className="pk-case-spine" aria-hidden="true" />
      <span className="pk-case-gloss" aria-hidden="true" />
    </span>
  );
}
