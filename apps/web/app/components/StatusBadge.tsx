import { StatusChip } from "@/app/components/playchive";

interface StatusBadgeProps {
  status: 'playing' | 'completed' | 'backlog' | 'onhold' | 'dropped' | string;
  label?: string;
}

/** Compatibility wrapper around the kit’s StatusChip (accepts legacy `backlog` / `onhold` keys). */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return <StatusChip status={status} label={label || undefined} />;
}
