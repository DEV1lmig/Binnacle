/**
 * Registry of the game cases currently on the page.
 *
 * Every `Cover` in the DOM registers itself here. The single WebGL stage reads the
 * registry each frame, so there is one canvas for the whole app instead of one per
 * cover — a browser drops WebGL contexts past roughly sixteen, and a library grid
 * shows thirty. The DOM element stays the source of truth for position, layout and
 * accessibility; the stage only draws on top of it.
 */
export type CaseSlot = {
  id: string;
  el: HTMLElement;
  coverUrl?: string | null;
  title: string;
  gameId?: string;
  /** Inside the viewport, so worth drawing. */
  visible: boolean;
};

const slots = new Map<string, CaseSlot>();
const listeners = new Set<() => void>();
let observer: IntersectionObserver | null = null;
let serial = 0;

function announce() {
  for (const listener of listeners) listener();
}

function watcher() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    entries => {
      let changed = false;
      for (const entry of entries) {
        const slot = [...slots.values()].find(s => s.el === entry.target);
        if (slot && slot.visible !== entry.isIntersecting) {
          slot.visible = entry.isIntersecting;
          changed = true;
        }
      }
      if (changed) announce();
    },
    // A generous margin so a case is ready before it scrolls into view.
    { rootMargin: "240px 0px" },
  );
  return observer;
}

export function registerCase(slot: Omit<CaseSlot, "id" | "visible">): () => void {
  const id = `case-${++serial}`;
  slots.set(id, { ...slot, id, visible: false });
  watcher()?.observe(slot.el);
  announce();
  return () => {
    watcher()?.unobserve(slot.el);
    slots.delete(id);
    announce();
  };
}

export function subscribeCases(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function visibleCases(): CaseSlot[] {
  return [...slots.values()].filter(slot => slot.visible && slot.el.isConnected);
}

/** The slot drawn over a given cover element, so a click can name the case to open. */
export function findSlotByElement(el: Element | null): CaseSlot | undefined {
  if (!el) return undefined;
  for (const slot of slots.values()) if (slot.el === el) return slot;
  return undefined;
}

/** Marks a cover so CSS can fade out its flat artwork once the case is drawn in 3D. */
export function setDrawn(el: HTMLElement, drawn: boolean) {
  if (drawn) el.dataset.case3d = "on";
  else delete el.dataset.case3d;
}
