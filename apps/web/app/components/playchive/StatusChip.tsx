export type LibraryStatus = "want_to_play" | "playing" | "completed" | "on_hold" | "dropped";

export const STATUS_LABEL: Record<LibraryStatus, string> = {
  want_to_play: "Backlog", playing: "Playing", completed: "Finished", on_hold: "On hold", dropped: "Dropped",
};
export const STATUS_ORDER: LibraryStatus[] = ["playing", "want_to_play", "completed", "on_hold", "dropped"];
/** Brand family per state, for places that need a raw colour (bars, dots). */
export const STATUS_COLOR: Record<LibraryStatus, string> = {
  playing: "#FF914D", want_to_play: "#245CF2", completed: "#FFC400", on_hold: "#8494AB", dropped: "#FF8A96",
};

const LEGACY: Record<string, LibraryStatus> = { backlog: "want_to_play", onhold: "on_hold" };

export function normalizeStatus(status: string): LibraryStatus {
  return (LEGACY[status] ?? status) as LibraryStatus;
}

export function StatusChip({ status, label, size }: { status: string; label?: string; size?: "lg" }) {
  const key = normalizeStatus(status);
  return <span className="pk-chip" data-status={key} data-size={size}>{label ?? STATUS_LABEL[key] ?? status}</span>;
}
