"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_TONE, rememberTone, type CoverTone } from "@/app/lib/coverColor";
import { buildCase, trayRect, vanishingPoint, type CaseHalves, type CaseLook, type Rect, type View } from "./caseBox";
import type { Medium } from "@/app/lib/medium";
import { textureUrl } from "./caseUrl";

type OpenRequest = { href: string; gameId?: string; tone: CoverTone; rect: DOMRect; src?: string; title: string; el?: HTMLElement };

const CaseTransitionContext = createContext<((request: OpenRequest) => void) | null>(null);
const CaseCloseContext = createContext<(() => void) | null>(null);

/** Opens a game case: the lid swings on its hinge and the reader is taken inside. */
export function useOpenCase() {
  return useContext(CaseTransitionContext);
}

/**
 * Puts the case a page rests in away: it rises out of the page, the lid closes, and
 * the route goes back — where the case lands on the cover it came from. Falls back
 * to a plain `router.back()` when there is no case on the page.
 */
export function useCloseCase() {
  const close = useContext(CaseCloseContext);
  const router = useRouter();
  return close ?? (() => router.back());
}

/* ------------------------------------------------------------------------------------
   Timing. The pose is three factors (`--fl-rise`, `--fl-open`, `--fl-dive`) written to
   the root each frame by the tween below and read by the stylesheet; the durations
   here only tell the driver when to ask for the route and how long to wait before
   giving up.
   ------------------------------------------------------------------------------------ */
/** The route is asked for as the lid starts to swing: usually there before the dive. */
const ASK = 300;
/** The page is revealed top to bottom inside the open case before the case comes in. */
const REVEAL = 560;
/** Never hold the reader hostage to a slow destination. */
const READY_PATIENCE = 2500;
/** If the route never commits at all, stop waiting rather than trapping the reader. */
const PATIENCE = 15000;
/** How long a pose may take to settle before it is taken as settled anyway. */
const SETTLE_PATIENCE = 2000;

type Pose = { rise: number; open: number; dive: number };
const SHELF: Pose = { rise: 0, open: 0, dive: 0 };
const HELD: Pose = { rise: 1, open: 1, dive: 0 };
const LANDED: Pose = { rise: 1, open: 1, dive: 1 };
/** Lid shut at the centre: where a case being put away waits for the route. */
const SHUT: Pose = { rise: 1, open: 0, dive: 0 };

/** Which choreography moves the factors. */
type Timing = "opening" | "closing" | "return";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
type Leg = { duration: number; delay?: number; ease: (t: number) => number };
/**
 * Opening: up off the shelf and open on one clock, then in once the page is inside.
 * Putting away: down out of the page and shut, then home onto its cover.
 */
const TIMINGS: Record<Timing, Record<keyof Pose, Leg>> = {
  opening: { rise: { duration: 520, ease: easeOut }, open: { duration: 580, delay: 100, ease: easeOut }, dive: { duration: 440, ease: easeIn } },
  closing: { dive: { duration: 520, ease: easeOut }, open: { duration: 480, delay: 160, ease: easeOut }, rise: { duration: 520, ease: easeOut } },
  return: { rise: { duration: 380, ease: easeOut }, open: { duration: 300, ease: easeOut }, dive: { duration: 300, ease: easeOut } },
};

/**
 * Moves the three factors and writes them to the root. Plain JavaScript on purpose:
 * transitions on registered custom properties are still uneven across browsers
 * (Safari on iOS among them), and this is the same cost either way — one style
 * recalc per frame. A new target starts from wherever the factor is now, so
 * reversing a gesture mid-flight is the same call as starting one.
 */
class Tween {
  private value: Pose = { ...SHELF };
  private legs: Partial<Record<keyof Pose, { from: number; to: number; start: number } & Leg>> = {};
  private frame = 0;

  read(name: keyof Pose) {
    return this.value[name];
  }

  /** Sets the factors outright, with nothing in motion. */
  jump(pose: Pose) {
    this.legs = {};
    this.value = { ...pose };
    this.write();
  }

  /** Moves the factors to `pose` with the given choreography. */
  go(pose: Pose, timing: Timing) {
    const now = performance.now();
    for (const name of Object.keys(pose) as (keyof Pose)[]) {
      if (Math.abs(this.value[name] - pose[name]) < 1e-4) { delete this.legs[name]; continue; }
      this.legs[name] = { ...TIMINGS[timing][name], from: this.value[name], to: pose[name], start: now };
    }
    if (!this.frame) this.frame = requestAnimationFrame(this.step);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.legs = {};
    this.value = { ...SHELF };
    for (const name of ["rise", "open", "dive"]) root().style.removeProperty(`--fl-${name}`);
  }

  private step = () => {
    this.frame = 0;
    const now = performance.now();
    let moving = false;
    for (const name of Object.keys(this.legs) as (keyof Pose)[]) {
      const leg = this.legs[name];
      if (!leg) continue;
      const t = Math.min(1, Math.max(0, (now - leg.start - (leg.delay ?? 0)) / leg.duration));
      this.value[name] = leg.from + (leg.to - leg.from) * leg.ease(t);
      if (t < 1) moving = true; else delete this.legs[name];
    }
    this.write();
    if (moving) this.frame = requestAnimationFrame(this.step);
  };

  private write() {
    const s = root().style;
    s.setProperty("--fl-rise", String(this.value.rise));
    s.setProperty("--fl-open", String(this.value.open));
    s.setProperty("--fl-dive", String(this.value.dive));
  }
}

/**
 * A still copy of the page being left, kept under the moving case until the next
 * page is ready. Routes swap in the middle of the move, and without this the reader
 * would see the shelf vanish, then a loading skeleton, then the page.
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
      if (node.matches("header, script, style, nextjs-portal, .pk-flight, .pk-ghost, [data-radix-popper-content-wrapper], [data-sonner-toaster]")) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const copy = node.cloneNode(true) as HTMLElement;
      for (const el of copy.querySelectorAll<HTMLElement>("[data-case-flight]")) delete el.dataset.caseFlight;
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

const viewport = (): View => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });

const root = () => document.documentElement;

const tween = new Tween();

function atPose(pose: Pose) {
  return (Object.keys(pose) as (keyof Pose)[]).every(name => Math.abs(tween.read(name) - pose[name]) < 0.003);
}

/**
 * Puts the page inside the case: its wrapper takes the same transform as the case
 * (the vanishing point and origin expressed in its own coordinates) and is clipped
 * to the tray floor. Laid out from the page's untransformed geometry, never
 * measured, because the page is the thing being moved.
 */
function seatPage(page: HTMLElement, tray: Rect, view: View) {
  const v = vanishingPoint(view);
  const pageTop = page.offsetTop - window.scrollY;
  const pageLeft = page.offsetLeft;
  const cx = tray.left + tray.width / 2;
  const cy = tray.top + tray.height / 2;
  // The floor is inset from the case's edge by the wall.
  const wall = tray.width * 0.02;
  const s = page.style;
  s.setProperty("--ox", `${cx - pageLeft}px`);
  s.setProperty("--oy", `${cy - pageTop}px`);
  s.setProperty("--vx", `${v.x - pageLeft}px`);
  s.setProperty("--vy", `${v.y - pageTop}px`);
  // Anchored to the page's top-left corner rather than inset from its edges: the
  // page keeps growing and shrinking while it waits (data arrives, sections
  // mount), and an inset from the bottom would slide the window off the content.
  const l = tray.left - pageLeft + wall;
  const t = tray.top - pageTop + wall;
  const r = tray.left + tray.width - pageLeft - wall;
  const b = tray.top + tray.height - pageTop - wall;
  s.setProperty("--case-clip", `polygon(${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px)`);
}

function unseatPage(page: HTMLElement) {
  for (const name of ["--ox", "--oy", "--vx", "--vy", "--case-clip"]) page.style.removeProperty(name);
  delete page.dataset.caseIn;
}

/** The shelf cover this case belongs on, if the page shows one. */
function findCover(key: string | undefined) {
  if (!key) return null;
  // Only a cover that is laid out counts — a list can render its tiles a frame
  // before they have a size — and never the still copy of one in the ghost.
  const all = Array.from(document.querySelectorAll<HTMLElement>(`.pk-cover[data-game-id="${CSS.escape(key)}"]`))
    .filter(el => !el.closest(".pk-ghost") && el.getBoundingClientRect().width > 8);
  const view = viewport();
  return all.find(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < view.height; }) ?? all[0] ?? null;
}

type Gesture = {
  id: number;
  kind: "open" | "close";
  /** The game, for finding its cover again. */
  key?: string;
  from: string;
  /** Where an opening is headed; `null` while putting away (back leads wherever it leads). */
  target: string | null;
  flight: CaseHalves;
  layers: [HTMLElement, HTMLElement];
  ghost: HTMLElement | null;
  /** The shelf cover hidden under the flight, to be shown again when it is released. */
  cover: HTMLElement | null;
  look: CaseLook;
  tray: Rect;
  /** `router.push` has been issued: from here on the route will move. */
  pushed: boolean;
  /** The new route has committed. */
  arrived: boolean;
  /** The lid is shut at the centre: a case being put away can go back now. */
  shut: boolean;
  wentBack: boolean;
  timers: number[];
  frames: number[];
};

/**
 * The transition's state machine. Everything asynchronous — timers, frame polls,
 * route changes — carries the id of the gesture that started it and is ignored the
 * moment a newer gesture exists. A gesture is either opening (shelf → page) or
 * closing (page → shelf); closing an opening that is still in flight re-aims the
 * same flight instead of starting another, so nothing is ever drawn twice.
 */
class CaseMachine {
  private serial = 0;
  private g: Gesture | null = null;
  router: { push: (href: string) => void; back: () => void } = { push: () => undefined, back: () => undefined };

  /* ---- plumbing ---- */

  private later(id: number, ms: number, fn: () => void) {
    const g = this.g;
    if (!g || g.id !== id) return;
    g.timers.push(window.setTimeout(() => { if (this.g?.id === id) fn(); }, ms));
  }

  /** Runs `fn` once the animated factors have reached `pose`, polled per frame. */
  private settle(id: number, pose: Pose, fn: () => void, extra?: () => boolean) {
    const began = performance.now();
    const tick = () => {
      const g = this.g;
      if (!g || g.id !== id) return;
      const overdue = performance.now() - began > SETTLE_PATIENCE;
      if ((atPose(pose) || overdue) && (!extra || extra() || overdue)) {
        // One more painted frame, so the final pose is on screen before anything changes.
        g.frames.push(requestAnimationFrame(() => { if (this.g?.id === id) fn(); }));
        return;
      }
      g.frames.push(requestAnimationFrame(tick));
    };
    tick();
  }

  private pose(pose: Pose, timing: Timing | "instant") {
    if (timing === "instant") { tween.jump(pose); return; }
    root().dataset.caseState = timing;
    tween.go(pose, timing);
  }

  /** The three rest poses the transform mixes between: shelf cover, centre, page tray. */
  private geometry(shelf: Rect | null, tray: Rect, view: View) {
    const s = root().style;
    const held = Math.min(view.width, view.height) * 0.42;
    const a = shelf ?? { left: view.width / 2 - held / 2, top: view.height / 2 - held / (2 * (2 / 3)), width: held, height: held / (2 / 3) };
    s.setProperty("--a-x", `${a.left + a.width / 2}px`);
    s.setProperty("--a-y", `${a.top + a.height / 2}px`);
    s.setProperty("--a-s", String(a.width / tray.width));
    s.setProperty("--h-x", `${view.width / 2}px`);
    s.setProperty("--h-y", `${view.height / 2}px`);
    s.setProperty("--h-s", String(held / tray.width));
    s.setProperty("--l-x", `${tray.left + tray.width / 2}px`);
    s.setProperty("--l-y", `${tray.top + tray.height / 2}px`);
    // The lid's corners match the cover's at shelf size, and grow with it.
    s.setProperty("--front-r", `${10 / (a.width / tray.width)}px`);
  }

  private mount(look: CaseLook, tray: Rect, view: View): { flight: CaseHalves; layers: [HTMLElement, HTMLElement] } {
    const flight = buildCase(look, tray, view);
    const floor = document.createElement("div");
    floor.className = "pk-flight";
    floor.dataset.layer = "floor";
    floor.setAttribute("aria-hidden", "true");
    floor.appendChild(flight.floor);
    const shell = floor.cloneNode(false) as HTMLElement;
    shell.dataset.layer = "shell";
    shell.appendChild(flight.shell);
    document.body.append(floor, shell);
    return { flight, layers: [floor, shell] };
  }

  /**
   * Lets go of whatever is in flight, all in one task so it is one frame: the flight
   * and the copy of the old page go, the page and the cover are their own again.
   */
  cancel() {
    const g = this.g;
    this.serial++;
    if (!g) return;
    this.g = null;
    g.timers.forEach(clearTimeout);
    g.frames.forEach(cancelAnimationFrame);
    for (const layer of g.layers) layer.remove();
    g.ghost?.remove();
    if (g.cover) delete g.cover.dataset.caseFlight;
    const page = document.querySelector<HTMLElement>(".pk-inside");
    if (page) unseatPage(page);
    delete document.body.dataset.caseHeld;
    const r = root();
    delete r.dataset.caseState;
    tween.stop();
    for (const name of ["a-x", "a-y", "a-s", "h-x", "h-y", "h-s", "l-x", "l-y", "front-r"]) r.style.removeProperty(`--${name}`);
    if (process.env.NODE_ENV !== "production") {
      console.assert(!document.querySelector(".pk-flight, .pk-ghost, [data-case-flight]"), "case transition: something was left behind");
    }
  }

  /* ---- gestures ---- */

  open(request: OpenRequest) {
    try {
      this.openCase(request);
    } catch {
      // Whatever the browser could not do, the reader still gets the page.
      this.cancel();
      this.router.push(request.href);
    }
  }

  private openCase(request: OpenRequest) {
    this.cancel();
    if (request.gameId) rememberTone(request.gameId, request.tone);
    const cover = request.el;
    if (!cover || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.router.push(request.href);
      return;
    }
    const view = viewport();
    const tray = trayRect(view);
    const rect = cover.getBoundingClientRect();
    const look: CaseLook = {
      from: cover,
      medium: (cover.dataset.medium as Medium | undefined) ?? "case",
      print: textureUrl(request.src, 1080),
      title: request.title,
      tone: request.tone,
    };
    this.geometry(rect, tray, view);
    this.pose(SHELF, "instant");
    const { flight, layers } = this.mount(look, tray, view);
    cover.dataset.caseFlight = "1";
    const id = this.serial;
    const g: Gesture = {
      id, kind: "open", key: request.gameId, from: window.location.pathname, target: request.href.split(/[?#]/)[0],
      flight, layers, ghost: ghostPage("page"), cover, look, tray,
      pushed: false, arrived: false, shut: false, wentBack: false, timers: [], frames: [],
    };
    this.g = g;
    document.body.dataset.caseHeld = "1";
    // The flight is painted once where the cover was; then it rises and opens.
    g.frames.push(requestAnimationFrame(() => { if (this.g?.id === id) this.pose(HELD, "opening"); }));
    this.later(id, ASK, () => { g.pushed = true; this.router.push(request.href); });
    this.later(id, PATIENCE, () => this.cancel());
  }

  close() {
    try {
      this.closeCase();
    } catch {
      this.cancel();
      this.router.back();
    }
  }

  private closeCase() {
    const g = this.g;
    if (g?.kind === "close") return;
    if (g?.kind === "open") {
      // Re-aim the flight that is already up. Before the route was asked for, the
      // shelf is still under it and the case simply goes home; after, the lid shuts
      // at the centre and the route goes back once it has somewhere to go back from.
      g.kind = "close";
      g.timers.forEach(clearTimeout);
      g.frames.forEach(cancelAnimationFrame);
      g.timers = [];
      g.frames = [];
      const page = document.querySelector<HTMLElement>(".pk-inside");
      if (page) page.dataset.caseIn = "away";
      this.later(g.id, PATIENCE, () => this.cancel());
      if (!g.pushed) {
        this.pose(SHELF, "closing");
        this.settle(g.id, SHELF, () => this.cancel());
      } else {
        this.pose(SHUT, "closing");
        this.settle(g.id, SHUT, () => { g.shut = true; this.maybeGoBack(); });
      }
      return;
    }
    const page = document.querySelector<HTMLElement>(".pk-inside");
    const rest = page?.querySelector<HTMLElement>(".pk-case-rest");
    if (!page || !rest || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.router.back();
      return;
    }
    this.cancel();
    const view = viewport();
    const tray = trayRect(view);
    const style = getComputedStyle(page);
    const tone: CoverTone = {
      tint: style.getPropertyValue("--case-tint").trim() || DEFAULT_TONE.tint,
      ink: style.getPropertyValue("--case-ink").trim() || DEFAULT_TONE.ink,
      deep: style.getPropertyValue("--case-deep").trim() || DEFAULT_TONE.deep,
      shade: style.getPropertyValue("--case-shade").trim() || DEFAULT_TONE.shade,
    };
    const look: CaseLook = { front: rest.dataset.print, frontHi: rest.dataset.print, print: rest.dataset.print, title: rest.dataset.title ?? "", tone, medium: (rest.dataset.medium as Medium | undefined) ?? "case" };
    this.geometry(null, tray, view);
    this.pose(LANDED, "instant");
    const { flight, layers } = this.mount(look, tray, view);
    const id = this.serial;
    const g2: Gesture = {
      id, kind: "close", key: rest.dataset.gameId, from: window.location.pathname, target: null,
      flight, layers, ghost: null, cover: null, look, tray,
      pushed: true, arrived: true, shut: false, wentBack: false, timers: [], frames: [],
    };
    this.g = g2;
    seatPage(page, tray, view);
    page.dataset.caseIn = "away";
    document.body.dataset.caseHeld = "1";
    g2.ghost = ghostPage("surface");
    g2.frames.push(requestAnimationFrame(() => { if (this.g?.id === id) this.pose(SHUT, "closing"); }));
    this.settle(id, SHUT, () => { g2.shut = true; this.maybeGoBack(); });
    this.later(id, PATIENCE, () => this.cancel());
  }

  /** A case being put away goes back once the lid is shut and the route is settled. */
  private maybeGoBack() {
    const g = this.g;
    if (!g || g.kind !== "close" || !g.shut || !g.arrived || g.wentBack) return;
    g.wentBack = true;
    g.arrived = false;
    g.from = window.location.pathname;
    const nav = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
    const canGoBack = nav?.canGoBack ?? window.history.length > 1;
    if (canGoBack) this.router.back(); else this.router.push("/backlog");
  }

  /* ---- the route moving under the flight ---- */

  route(pathname: string) {
    const g = this.g;
    if (!g) return;
    if (g.kind === "open") {
      if (pathname === g.target) {
        g.arrived = true;
        this.whenReady(g.id, () => Boolean(document.querySelector(".pk-inside .pk-case-rest")), () => this.pageIn());
        return;
      }
      if (pathname !== g.from) { this.cancel(); return; }
      if (!g.arrived) return;
      // The browser's own back button, mid-opening: the shelf is live again under
      // the copy of it, so the case shuts and goes home in one move.
      g.kind = "close";
      g.wentBack = true;
      g.timers.forEach(clearTimeout);
      g.frames.forEach(cancelAnimationFrame);
      g.timers = [];
      g.frames = [];
      this.later(g.id, PATIENCE, () => this.cancel());
      this.whenReady(g.id, () => Boolean(findCover(g.key)), () => this.landOnShelf());
      return;
    }
    if (pathname === g.from) return;
    // Closing: the route has moved. Either the detail page arrived late (an opening
    // re-aimed while its push was pending) and back can go now, or back has landed.
    if (!g.wentBack) {
      if (pathname !== g.target) { this.cancel(); return; }
      g.arrived = true;
      this.maybeGoBack();
      return;
    }
    // The shelf's covers can render before their ids do; wait for this game's own.
    this.whenReady(g.id, () => Boolean(findCover(g.key)), () => this.landOnShelf());
  }

  /** Polls, per frame, for the destination to have its data; gives up after a while. */
  private whenReady(id: number, ready: () => boolean, fn: () => void) {
    const began = performance.now();
    const tick = () => {
      const g = this.g;
      if (!g || g.id !== id) return;
      if (ready() || performance.now() - began > READY_PATIENCE) { fn(); return; }
      g.frames.push(requestAnimationFrame(tick));
    };
    tick();
  }

  /** The page is there: seat it inside the case, reveal it, and once the case is open, dive. */
  private pageIn() {
    const g = this.g;
    if (!g || g.kind !== "open") return;
    const page = document.querySelector<HTMLElement>(".pk-inside");
    if (page) {
      seatPage(page, g.tray, viewport());
      page.dataset.caseIn = "1";
    }
    const revealed = performance.now() + REVEAL;
    this.settle(g.id, HELD, () => {
      this.pose(LANDED, "opening");
      this.settle(g.id, LANDED, () => this.cancel());
    }, () => performance.now() >= revealed);
  }

  /** Back has landed: the case glides onto its cover, or fades if the shelf has none. */
  private landOnShelf() {
    const g = this.g;
    if (!g || g.kind !== "close") return;
    const cover = findCover(g.key);
    g.ghost?.remove();
    g.ghost = null;
    if (!cover) {
      for (const layer of g.layers) layer.dataset.fade = "1";
      this.later(g.id, 260, () => this.cancel());
      return;
    }
    const view = viewport();
    this.geometry(cover.getBoundingClientRect(), g.tray, view);
    g.cover = cover;
    cover.dataset.caseFlight = "1";
    this.pose(SHELF, "return");
    this.settle(g.id, SHELF, () => this.cancel());
  }
}

const machine = new CaseMachine();


/**
 * Drives the case between a shelf and the page inside it. The machine above owns
 * every state; this component only lends it the router and tells it when the route
 * has moved.
 */
export function CaseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { machine.router = router; }, [router]);
  useEffect(() => { machine.route(pathname); }, [pathname]);
  useEffect(() => () => machine.cancel(), []);

  return (
    <CaseTransitionContext.Provider value={openCase}>
      <CaseCloseContext.Provider value={closeCase}>
        {children}
      </CaseCloseContext.Provider>
    </CaseTransitionContext.Provider>
  );
}

const openCase = (request: OpenRequest) => machine.open(request);
const closeCase = () => machine.close();
