"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Puts a newly opened page at its top.
 *
 * Next only scrolls a route into view when the new page's own root is off screen
 * (`layout-router`, `getScrollTargetState`). Under a sticky header it rarely is: the
 * browser clamps the old offset to the new document, the top of the page is still
 * visible in what is left, and Next decides nothing needs moving. The reader opens a
 * game and lands halfway down it. Scroll anchoring then finishes the job, dragging
 * them further as the route's data streams in and the document grows back.
 *
 * Going back is left alone — the browser restoring the previous position is the whole
 * point of going back — so only forward navigations are reset.
 */
export function ScrollReset() {
  const pathname = usePathname();
  const first = useRef(true);
  const popped = useRef(false);

  useEffect(() => {
    const onPop = () => { popped.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (popped.current) {
      popped.current = false;
      return;
    }
    // Anchoring is suppressed at offset zero, so one honest reset is enough: the page
    // stays put while the rest of its content arrives.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
