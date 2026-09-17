"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { DEFAULT_TONE, readCoverTone, recallTone, rememberTone, type CoverTone } from "@/app/lib/coverColor";
import { registerCase } from "./case3d/store";
import { textureUrl } from "./case3d/caseArt";

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
  const url = getStandardCoverUrl(src);
  const shell = useRef<HTMLSpanElement>(null);

  // Offer this cover to the shared 3D stage. If the stage never mounts, nothing changes.
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    return registerCase({ el, coverUrl: textureUrl(url), title, gameId });
  }, [url, title, gameId]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const next = readCoverTone(event.currentTarget, url);
    setTone(next);
    if (gameId) rememberTone(gameId, next);
    onTone?.(next);
  };

  return (
    <span
      ref={shell}
      className={`pk-cover ${className}`}
      data-tilt={tilt || undefined}
      data-case="true"
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
