"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { rememberTone, toneVars, type CoverTone } from "@/app/lib/coverColor";
import { findSlotByElement } from "./case3d/store";
import { focusStore } from "./case3d/focus";

type OpenRequest = { href: string; gameId?: string; tone: CoverTone; rect: DOMRect; src?: string; title: string; el?: HTMLElement };
type Overlay = Omit<OpenRequest, "rect"> & { rect: { top: number; left: number; width: number; height: number }; flood: number; solid: boolean };

const CaseTransitionContext = createContext<((request: OpenRequest) => void) | null>(null);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** How far one leg of the gesture has run at `now`, on the driver's single clock. */
const phaseOf = (now: number, from: number, to: number) => clamp01((now - from) / (to - from));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

/** Opens a game case: the lid swings on its hinge and the inside floods the screen. */
export function useOpenCase() {
  return useContext(CaseTransitionContext);
}

/** The flat stand-in's inside covers the screen at 560ms; the page swaps once it does. */
const COVERED = 560;
/**
 * The real case takes longer on purpose. Covering the screen at 560ms was the bug the
 * reader saw: the veil swallowed the case before the lid had finished swinging, so the
 * gesture read as a coloured wipe. Nothing is drawn over the case until 780ms, by which
 * point it is open and already rushing the camera.
 */
const CASE_RISE = 520;
const CASE_OPEN_FROM = 100;
const CASE_OPEN_TO = 680;
const CASE_DIVE_FROM = 560;
const CASE_COVERED = 1000;
/** If the route never commits, stop waiting rather than trapping the reader. */
const PATIENCE = 4000;
const FADE = 380;

/**
 * Drives the opening animation and the page swap.
 *
 * The hinge is a real element rather than a view-transition pseudo: the destination
 * loads its data asynchronously, so a snapshot would freeze on a skeleton and, worse,
 * a view transition awaiting the route would suppress painting for the whole fetch.
 * Here the flood covers the screen first, the route is pushed underneath it, and the
 * overlay only lifts once the new page has actually committed.
 */
export function CaseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [phase, setPhase] = useState<"open" | "leave">("open");
  const from = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback(() => {
    from.current = null;
    // Letting the case go returns it to whatever cover the new route shows, so it
    // travels from the middle of the screen into the detail hero instead of cutting.
    focusStore.set(null);
    setPhase("leave");
    timers.current.push(window.setTimeout(() => setOverlay(null), FADE));
  }, []);

  // Lift the overlay when the new route commits, not on a fixed timer, and give
  // that route a painted frame first so the reader never sees it assemble.
  useEffect(() => {
    if (!from.current || from.current === pathname) return;
    from.current = null;
    const frame = requestAnimationFrame(() => requestAnimationFrame(dismiss));
    return () => cancelAnimationFrame(frame);
  }, [pathname, dismiss]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = useCallback((request: OpenRequest) => {
    if (request.gameId) rememberTone(request.gameId, request.tone);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(request.href);
      return;
    }

    // When the 3D stage is drawing this cover, the case itself performs the opening
    // and the flat overlay is only there to wash the screen in the inside colour.
    const slot = findSlotByElement(request.el ?? null);
    const solid = Boolean(slot && request.el?.dataset.case3d === "on");
    if (slot && solid) {
      const started = performance.now();
      const step = () => {
        const now = performance.now() - started;
        focusStore.set({
          id: slot.id,
          // Out of the shelf and open: eased out, so both settle rather than stop dead.
          rise: easeOut(phaseOf(now, 0, CASE_RISE)),
          open: easeOut(phaseOf(now, CASE_OPEN_FROM, CASE_OPEN_TO)),
          // In: eased in, because being pulled into the case should accelerate.
          dive: easeIn(phaseOf(now, CASE_DIVE_FROM, CASE_COVERED)),
        });
        if (now < CASE_COVERED && from.current) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    const { top, left, width, height } = request.rect;
    const cx = left + width / 2;
    const cy = top + height / 2;
    // Grow the flood until it clears the furthest corner of the viewport.
    const reach = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(window.innerWidth - cx, cy),
      Math.hypot(cx, window.innerHeight - cy),
      Math.hypot(window.innerWidth - cx, window.innerHeight - cy),
    );

    from.current = window.location.pathname;
    setPhase("open");
    setOverlay({ ...request, rect: { top, left, width, height }, flood: (reach * 2) / Math.max(width, 1) + 0.4, solid });
    timers.current.push(window.setTimeout(() => router.push(request.href), solid ? CASE_COVERED : COVERED));
    timers.current.push(window.setTimeout(() => { if (from.current) dismiss(); }, PATIENCE));
  }, [router, dismiss]);

  return (
    <CaseTransitionContext.Provider value={open}>
      {children}
      {overlay && (
        <div
          className="pk-opening"
          data-phase={phase}
          aria-hidden="true"
          style={{
            ...toneVars(overlay.tone),
            "--case-top": `${overlay.rect.top}px`,
            "--case-left": `${overlay.rect.left}px`,
            "--case-w": `${overlay.rect.width}px`,
            "--case-h": `${overlay.rect.height}px`,
            "--flood-scale": overlay.flood,
          } as React.CSSProperties}
          data-solid={overlay.solid || undefined}
        >
          <span className="pk-opening-flood" />
          {/* The moulded plastic the dive ends on, so the veil and the page behind it
              are the same surface and the swap has nothing to give away. */}
          <span className="pk-opening-inside pk-case-inside">
            <span className="pk-case-ribs" />
            <span className="pk-case-sheen" />
            <span className="pk-case-vignette" />
          </span>
          <span className="pk-opening-case">
            <span className="pk-opening-tray">
              <span className="pk-opening-booklet">
                <b>{overlay.title}</b>
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="pk-opening-lid">
              <span className="pk-opening-front">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {overlay.src ? <img src={overlay.src} alt="" /> : null}
                <span className="pk-opening-band"><i className="pk-case-mark" />playchive</span>
              </span>
              <span className="pk-opening-back" />
            </span>
          </span>
        </div>
      )}
    </CaseTransitionContext.Provider>
  );
}
