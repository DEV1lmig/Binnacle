/**
 * The game case, built out of DOM planes.
 *
 * One builder makes every case in the app: the one a detail page rests in, and the
 * one that flies between a shelf cover and that page. They are the same object, so
 * the hand-over between them is a change of layer, never a change of picture.
 *
 * The case is a box `W × H` px with its floor at z = 0, four walls running towards
 * the viewer, a lip where the walls end, and a lid hinged on the left wall. It is
 * split in two halves that can live in different layers: the `floor`, which the
 * page's content sits on, and the `shell` (walls, lip, lid), which is drawn over
 * the content. Both halves carry the same transform, read from custom properties
 * (`--fl-*`), so they never drift apart.
 */
import type { CoverTone } from "@/app/lib/coverColor";
import { toneVars } from "@/app/lib/coverColor";

export type Rect = { left: number; top: number; width: number; height: number };
export type View = { width: number; height: number };

/** Case proportions: the same 2:3 as every cover on a shelf. */
export const CASE_ASPECT = 2 / 3;
/** How far the lid swings while the case is held, and when it lies open in a page. */
export const LID_HELD = 143;
export const LID_FLAT = 169;
/** The lean of a case lying open in a page: far edge away, near edge close. */
export const LEAN_FLAT = 0.19;
/** The camera: one fixed perspective and one vanishing point for every case. */
export const PERSPECTIVE = 1100;
export const VANISH = { x: 0.5, y: 0.3 };

export type CaseLook = {
  /** Cover art for the lid's front: what is already decoded on screen, so the first frame never waits. */
  front?: string;
  /** The same art at the size the lid reaches; drawn over `front` once it has loaded. */
  frontHi?: string;
  /** The artwork printed inside the tray, faded into the plastic. */
  print?: string;
  title: string;
  tone: CoverTone;
};

/**
 * Where the tray of an open page sits: fitted to the page's width, keeping the
 * case's proportions, so it runs on past the fold like a case seen from close up.
 */
export function trayRect(view: View): Rect {
  const top = Math.max(64, view.height * 0.11);
  const side = view.width * 0.016;
  const width = view.width - side * 2;
  return { left: side, top, width, height: width / CASE_ASPECT };
}

/** Vanishing point, in viewport pixels. */
export function vanishingPoint(view: View) {
  return { x: view.width * VANISH.x, y: view.height * VANISH.y };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: HTMLElement) {
  const node = document.createElement(tag);
  node.className = className;
  parent?.appendChild(node);
  return node;
}

function applyTone(node: HTMLElement, tone: CoverTone) {
  for (const [name, value] of Object.entries(toneVars(tone))) node.style.setProperty(name, String(value));
}

/** The tray's floor: moulded plastic, the print, the gloss, and the spine's band along the far edge. */
function buildFloor(look: CaseLook) {
  const floor = el("div", "pk-c-floor pk-case-inside");
  el("span", "pk-case-ribs", floor);
  if (look.print) {
    const print = el("img", "pk-case-print", floor);
    print.src = look.print;
    print.alt = "";
    print.draggable = false;
  }
  el("span", "pk-case-sheen", floor);
  el("span", "pk-case-vignette", floor);
  const hinge = el("span", "pk-case-hinge", floor);
  el("i", "pk-case-mark", hinge);
  hinge.appendChild(document.createTextNode("playchive"));
  return floor;
}

/** The lid's front: the same anatomy as a shelf cover, so the two are one picture. */
function buildFront(look: CaseLook) {
  const front = el("div", "pk-c-lid-front pk-cover");
  front.dataset.case = "true";
  // `.pk-cover` carries the brand blue as its own fallback tone; a shelf cover
  // overrides it inline once its art is read, and so must this one.
  front.style.setProperty("--case-tint", look.tone.tint);
  front.style.setProperty("--case-ink", look.tone.ink);
  if (look.front) {
    const art = el("img", "", front);
    art.src = look.front;
    art.alt = "";
    art.draggable = false;
    if (look.frontHi && look.frontHi !== look.front) {
      const hi = el("img", "pk-c-hi", front);
      hi.alt = "";
      hi.draggable = false;
      hi.onload = () => { hi.dataset.ready = "1"; };
      hi.src = look.frontHi;
      if (hi.complete && hi.naturalWidth) hi.dataset.ready = "1";
    }
  } else {
    el("span", "pk-cover-empty", front).textContent = look.title;
  }
  const band = el("span", "pk-case-band", front);
  el("i", "pk-case-mark", band);
  band.appendChild(document.createTextNode("playchive"));
  el("span", "pk-case-spine", front);
  el("span", "pk-case-gloss", front);
  return front;
}

/** Walls, lip and lid. */
function buildShell(look: CaseLook) {
  const shell = el("div", "pk-c-shell");
  const spine = el("div", "pk-c-wall pk-c-wall-l pk-c-spine", shell);
  el("i", "pk-case-mark", spine);
  el("b", "", spine).textContent = look.title;
  el("div", "pk-c-wall pk-c-wall-l pk-c-wall-in", shell);
  el("div", "pk-c-wall pk-c-wall-r", shell);
  el("div", "pk-c-wall pk-c-wall-t", shell);
  el("div", "pk-c-wall pk-c-wall-b", shell);
  el("div", "pk-c-lip", shell);
  const hinge = el("div", "pk-c-hinge", shell);
  el("div", "pk-c-lid-back", hinge);
  el("div", "pk-c-lid-edge", hinge);
  hinge.appendChild(buildFront(look));
  return shell;
}

/**
 * Places a case box: its rest geometry, its centre as transform origin, and the
 * vanishing point in its own coordinates. The transform itself is in the stylesheet.
 */
export function placeBox(box: HTMLElement, rect: Rect, view: View) {
  const v = vanishingPoint(view);
  const s = box.style;
  s.left = `${rect.left}px`;
  s.top = `${rect.top}px`;
  s.width = `${rect.width}px`;
  s.height = `${rect.height}px`;
  s.setProperty("--W", `${rect.width}px`);
  s.setProperty("--ox", `${rect.width / 2}px`);
  s.setProperty("--oy", `${rect.height / 2}px`);
  s.setProperty("--vx", `${v.x - rect.left}px`);
  s.setProperty("--vy", `${v.y - rect.top}px`);
}

export type CaseHalves = { floor: HTMLElement; shell: HTMLElement };

/** Two boxes at the same place: one holding the floor, one the walls and lid. */
export function buildCase(look: CaseLook, rect: Rect, view: View): CaseHalves {
  const floor = el("div", "pk-case3 pk-carry");
  floor.appendChild(buildFloor(look));
  const shell = el("div", "pk-case3 pk-carry");
  shell.appendChild(buildShell(look));
  for (const box of [floor, shell]) {
    applyTone(box, look.tone);
    placeBox(box, rect, view);
  }
  return { floor, shell };
}
