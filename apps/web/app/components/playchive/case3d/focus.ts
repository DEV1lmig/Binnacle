/**
 * Which case is being opened, and how far along each part of the gesture is.
 *
 * The three values are driven from one clock in `CaseOpening`, and the stage reads
 * them as plain interpolation factors. Keeping the easing in the driver — rather than
 * damping towards a target in the render loop — is what makes the case land exactly
 * where it should on every frame instead of trailing behind the animation.
 */
export type FocusState = {
  /** The case's key (`slotKey`): the same game keeps the focus across the route swap. */
  key: string;
  /** 0 on its shelf, 1 centred and enlarged. */
  rise: number;
  /** 0 shut, 1 with the lid swung fully off its hinge. */
  open: number;
  /** 0 at arm's length, 1 with the open tray swallowing the camera. */
  dive: number;
};

let state: FocusState | null = null;
const listeners = new Set<(next: FocusState | null) => void>();

export const focusStore = {
  get: () => state,
  set(next: FocusState | null) {
    state = next;
    for (const listener of listeners) listener(next);
  },
  subscribe(listener: (next: FocusState | null) => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
