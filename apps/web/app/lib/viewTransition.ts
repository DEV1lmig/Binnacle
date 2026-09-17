import { flushSync } from "react-dom";

type StartViewTransition = (callback: () => void) => { finished: Promise<void> };

/**
 * Runs a synchronous state change inside a view transition, so the browser
 * cross-fades and morphs the before/after layouts instead of snapping.
 *
 * Only for updates that commit immediately — filters, view toggles, tab switches.
 * Route changes are deliberately excluded: the View Transitions API suppresses
 * painting until its callback settles, so awaiting an async navigation there would
 * freeze the screen for the length of the fetch. Those use the case opening instead.
 *
 * Falls back to a plain update where the API is missing or motion is reduced.
 */
export function withViewTransition(update: () => void) {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (!start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  start.call(document, () => flushSync(update));
}
