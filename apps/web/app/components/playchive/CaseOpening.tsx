"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { rememberTone, toneVars, type CoverTone } from "@/app/lib/coverColor";
import { findOpenSlot, findSlotByElement, hasShelfCase, slotKey } from "./case3d/store";
import { buildInsideArt } from "./case3d/caseSkins";
import { focusStore } from "./case3d/focus";

type OpenRequest = { href: string; gameId?: string; tone: CoverTone; rect: DOMRect; src?: string; title: string; el?: HTMLElement };
type Overlay = Omit<OpenRequest, "rect"> & { rect: { top: number; left: number; width: number; height: number }; flood: number; solid: boolean };

const CaseTransitionContext = createContext<((request: OpenRequest) => void) | null>(null);
const CaseCloseContext = createContext<(() => void) | null>(null);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** How far one leg of the gesture has run at `now`, on the driver's single clock. */
const phaseOf = (now: number, from: number, to: number) => clamp01((now - from) / (to - from));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

/** Opens a game case: the lid swings on its hinge and the reader is taken inside. */
export function useOpenCase() {
  return useContext(CaseTransitionContext);
}

/**
 * Puts the case a page rests in away: it rises out of the page, the lid closes, and
 * the route goes back — where the case lands on the cover it came from. Falls back
 * to a plain `router.back()` when no case is drawn.
 */
export function useCloseCase() {
  const close = useContext(CaseCloseContext);
  const router = useRouter();
  return close ?? (() => router.back());
}

/** The flat stand-in's inside covers the screen at 560ms; the page swaps once it does. */
const COVERED = 560;
/**
 * The real case takes longer on purpose, and nothing is ever drawn over it. It
 * rises off its shelf, swings open, and rushes the camera until its inside fills
 * the screen; the route changes under that, and the same case — still moving —
 * settles into the pose the new page rests in, with the content already on top.
 */
const CASE_RISE = 520;
const CASE_OPEN_FROM = 100;
const CASE_OPEN_TO = 680;
/**
 * The dive — the open case coming in with the page inside it — only starts once
 * the page is actually there. Until then the case waits, open, at the centre. It is
 * the mirror of putting a case away, where the page shrinks inside it as it closes;
 * and it means a slow route (a first visit in dev compiles for seconds) can never
 * leave the reader looking at a case that opened onto nothing.
 */
const CASE_DIVE = 440;
/** The page is revealed top to bottom inside the open case before the case comes in. */
const CASE_REVEAL = 560;
/**
 * The route is asked for as the lid starts to swing, so the page is usually there,
 * drawn inside the case, before the dive begins. Asking at the click would take the
 * shelf away under a case that has barely moved.
 */
const CASE_ASK = 300;
/** Putting it away: up out of the page and shut, then back to the shelf. */
const CASE_AWAY = 640;

/**
 * A still copy of the page being left, kept under the moving case until the next
 * page is ready. Routes swap in the middle of the move — the destination is asked
 * for while the lid is still swinging — and without this the reader would see the
 * shelf vanish, then a loading skeleton, then the page: three frames that should
 * not exist. The copy is inert, opaque, and shows the flat artwork of every cover,
 * since the cases drawn over them in 3D leave with the route.
 */
function ghostPage(kind: "page" | "surface") {
  const ghost = document.createElement("div");
  ghost.className = "pk-ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  ghost.style.background = getComputedStyle(document.body).backgroundColor;
  if (kind === "surface") {
    const surface = document.createElement("div");
    surface.className = "pk-case-view";
    ghost.appendChild(surface);
  } else {
    for (const node of Array.from(document.body.children)) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches("header, script, style, nextjs-portal, .pk-stage, .pk-opening, .pk-ghost, [data-radix-popper-content-wrapper], [data-sonner-toaster]")) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const copy = node.cloneNode(true) as HTMLElement;
      for (const el of copy.querySelectorAll<HTMLElement>("[data-case3d]")) delete el.dataset.case3d;
      for (const el of copy.querySelectorAll<HTMLElement>("[id]")) el.removeAttribute("id");
      for (const el of copy.querySelectorAll("canvas, video, iframe, script")) el.remove();
      // Pinned exactly where the original is on screen, header and scroll included.
      copy.style.position = "absolute";
      copy.style.top = `${rect.top}px`;
      copy.style.left = `${rect.left}px`;
      copy.style.width = `${rect.width}px`;
      copy.style.margin = "0";
      ghost.appendChild(copy);
    }
  }
  document.body.appendChild(ghost);
  return ghost;
}

function dropGhost(ghost: HTMLElement | null) {
  ghost?.remove();
}

/** What "the destination is ready" means, for each direction. */
const READY = {
  /** A detail page renders its wrapper only once it has its data. */
  page: () => Boolean(document.querySelector(".pk-inside")),
  /** A list page has covers on the shelf once its data is in. */
  shelf: () => hasShelfCase(),
};
/** Never hold the reader hostage to a slow page. */
const READY_PATIENCE = 2500;

/** Page-in-case custom properties: reset so a page never flashes before its first frame. */
function holdPage(held: boolean) {
  const style = document.documentElement.style;
  if (held) {
    document.body.dataset.caseHeld = "1";
    style.setProperty("--case-clip", "100%");
  } else {
    delete document.body.dataset.caseHeld;
    for (const name of ["p", "ox", "oy", "vx", "vy", "tx", "ty", "tz", "lean", "tilt", "sx", "sy", "clip"]) style.removeProperty(`--case-${name}`);
  }
}
/** If the route never commits at all, stop waiting rather than trapping the reader. */
const PATIENCE = 15000;
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
  /** All three before the case is let go: the new route, its data, and the end of the move. */
  const arrived = useRef(false);
  const ready = useRef(false);
  const settled = useRef(false);
  const readyCheck = useRef<(() => boolean) | null>(null);
  const ghost = useRef<HTMLElement | null>(null);

  const dismiss = useCallback(() => {
    from.current = null;
    arrived.current = false;
    ready.current = false;
    settled.current = false;
    readyCheck.current = null;
    dropGhost(ghost.current);
    ghost.current = null;
    holdPage(false);
    // Letting the case go returns it to whatever cover the new route shows, so it
    // travels from the middle of the screen into the detail hero instead of cutting.
    focusStore.set(null);
    setPhase("leave");
    timers.current.push(window.setTimeout(() => setOverlay(null), FADE));
  }, []);

  const settle = useCallback(() => {
    if (arrived.current && ready.current && settled.current) dismiss();
  }, [dismiss]);

  // The new route committing is one of the things the case waits for. Then its data:
  // polled, because a page renders its skeleton first and its content when Convex
  // answers, and the case must not be let go — nor the ghost lifted — in between.
  useEffect(() => {
    if (!from.current || from.current === pathname) return;
    arrived.current = true;
    const check = readyCheck.current;
    const began = performance.now();
    let frame = 0;
    const poll = () => {
      if (!from.current) return;
      if (!check || check() || performance.now() - began > READY_PATIENCE) {
        ready.current = true;
        // One painted frame first, so the reader never sees the page assemble.
        frame = requestAnimationFrame(() => requestAnimationFrame(settle));
        return;
      }
      frame = requestAnimationFrame(poll);
    };
    poll();
    return () => cancelAnimationFrame(frame);
  }, [pathname, settle]);

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
    settled.current = !solid;
    readyCheck.current = null;
    if (slot && solid) {
      // The inside the page will rest on, painted now so the settle never pops.
      if (request.gameId) {
        const trayW = window.innerWidth * 0.968;
        const trayH = (trayW * 1.7) / 1.2;
        const visible = Math.min(1, (window.innerHeight - Math.max(64, window.innerHeight * 0.11)) / trayH);
        buildInsideArt(request.gameId, request.src?.startsWith("/") ? request.src : `/_next/image?url=${encodeURIComponent(request.src ?? "")}&w=828&q=75`, 1.2 / 1.7, 4, visible).catch(() => undefined);
      }
      holdPage(true);
      ghost.current = ghostPage("page");
      readyCheck.current = READY.page;
      const key = slotKey(slot);
      const started = performance.now();
      let readyAt: number | null = null;
      let diveFrom: number | null = null;
      const step = () => {
        const now = performance.now() - started;
        // Out of the shelf and open on one clock; in on another, started only once
        // the page has arrived (or patience ran out) and has been revealed inside.
        if (readyAt === null && ready.current) readyAt = performance.now();
        if (diveFrom === null && now >= CASE_OPEN_TO && readyAt !== null && performance.now() - readyAt >= CASE_REVEAL) diveFrom = performance.now();
        const dive = diveFrom === null ? 0 : easeIn(phaseOf(performance.now() - diveFrom, 0, CASE_DIVE));
        focusStore.set({
          key,
          rise: easeOut(phaseOf(now, 0, CASE_RISE)),
          open: easeOut(phaseOf(now, CASE_OPEN_FROM, CASE_OPEN_TO)),
          dive,
        });
        if (!from.current) return;
        if (dive < 1) requestAnimationFrame(step);
        else requestAnimationFrame(() => { settled.current = true; settle(); }); // one more frame, so the last pose is drawn before the case is let go
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
    // The real case needs no overlay: it is its own veil, and then its own page.
    if (solid) settled.current = false;
    else setOverlay({ ...request, rect: { top, left, width, height }, flood: (reach * 2) / Math.max(width, 1) + 0.4, solid });
    timers.current.push(window.setTimeout(() => router.push(request.href), solid ? CASE_ASK : COVERED));
    timers.current.push(window.setTimeout(() => { if (from.current) dismiss(); }, PATIENCE));
  }, [router, dismiss, settle]);

  const close = useCallback(() => {
    const slot = findOpenSlot();
    const drawn = Boolean(slot && slot.el.dataset.case3d === "on");
    if (!slot || !drawn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.back();
      return;
    }
    const page = document.querySelector<HTMLElement>(".pk-inside");
    if (page) page.dataset.caseIn = "away";
    holdPage(true);
    ghost.current = ghostPage("surface");
    readyCheck.current = READY.shelf;
    from.current = window.location.pathname;
    settled.current = false;
    const key = slotKey(slot);
    const started = performance.now();
    const step = () => {
      const now = performance.now() - started;
      focusStore.set({
        key,
        rise: easeOut(phaseOf(now, 0, 520)),
        open: 1 - easeOut(phaseOf(now, 160, CASE_AWAY)),
        dive: 0,
      });
      if (!from.current) return;
      if (now < CASE_AWAY) requestAnimationFrame(step);
      else requestAnimationFrame(() => { settled.current = true; settle(); }); // one more frame, so the last pose is drawn before the case is let go
    };
    requestAnimationFrame(step);
    // With no page to go back to, the shelf is the next best thing.
    const nav = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
    const canGoBack = nav?.canGoBack ?? window.history.length > 1;
    timers.current.push(window.setTimeout(() => { if (canGoBack) router.back(); else router.push("/backlog"); }, CASE_AWAY));
    timers.current.push(window.setTimeout(() => { if (from.current) dismiss(); }, PATIENCE));
  }, [router, dismiss, settle]);

  return (
    <CaseTransitionContext.Provider value={open}>
      <CaseCloseContext.Provider value={close}>
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
      </CaseCloseContext.Provider>
    </CaseTransitionContext.Provider>
  );
}
