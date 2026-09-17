"use client";

import { useState } from "react";
import { DEFAULT_TONE, recallTone, type CoverTone } from "@/app/lib/coverColor";

/**
 * Tone for a detail page. Starts from what the case remembered when it was opened,
 * so the first paint is already tinted, and is refined once the page's own cover
 * decodes (direct visits, reloads, shared links).
 */
export function useCaseTone(gameId?: string): [CoverTone, (tone: CoverTone) => void] {
  const [tone, setTone] = useState<CoverTone>(() => recallTone(gameId) ?? DEFAULT_TONE);
  return [tone, setTone];
}

/**
 * The inside of the case: moulded plastic in the cover's own colour, with the tray's
 * ribs, its gloss and its walls, so the page reads as the space behind the artwork
 * rather than a flat coloured screen. The veil that ends the opening dive is built
 * from the same layers, which is what lets the two swap without a seam.
 *
 * The colours come from `toneVars` on the page wrapper, so the panels sitting in the
 * tray take the same tone as the tray itself.
 */
export function CaseBackdrop() {
  return (
    <div className="pk-case-backdrop pk-case-inside" aria-hidden="true">
      <span className="pk-case-ribs" />
      <span className="pk-case-sheen" />
      <span className="pk-case-vignette" />
    </div>
  );
}
