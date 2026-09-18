"use client";

import Image from "next/image";
import { useState, type SyntheticEvent } from "react";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { readCoverTone, rememberTone, type CoverTone } from "@/app/lib/coverColor";

/**
 * The game's disc, seated in the tray's hub, with the cover printed on it as the
 * label. A detail page is already the open case, so it shows what a case holds
 * rather than a second, smaller case in the corner.
 *
 * Reads the cover's tone on load, like `Cover` does, so a direct visit still tints
 * the page from the artwork.
 */
export function Disc({ src, title, sizes = "280px", priority, gameId, onTone }: {
  src?: string | null;
  title: string;
  sizes?: string;
  priority?: boolean;
  gameId?: string;
  onTone?: (tone: CoverTone) => void;
}) {
  const [failed, setFailed] = useState(false);
  const url = getStandardCoverUrl(src);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const tone = readCoverTone(event.currentTarget, url);
    if (gameId) rememberTone(gameId, tone);
    onTone?.(tone);
  };

  return (
    <span className="pk-disc-seat" role="img" aria-label={title}>
      <span className="pk-hub" aria-hidden="true" />
      <span className="pk-disc" aria-hidden="true">
        <span className="pk-disc-label">
          {url && !failed
            ? <Image src={url} alt="" fill sizes={sizes} priority={priority} onLoad={handleLoad} onError={() => setFailed(true)} />
            : <span className="pk-disc-empty">{title}</span>}
        </span>
        <span className="pk-disc-sheen" />
        <span className="pk-disc-ring" />
      </span>
    </span>
  );
}
