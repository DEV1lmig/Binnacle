import { STATUS_COLORS } from "@/app/lib/design-system";
import { FONT_MONO } from "@/app/lib/design-system";

interface StatusBadgeProps {
  status: 'playing' | 'completed' | 'backlog' | 'onhold' | 'dropped';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusLabels: Record<StatusBadgeProps['status'], string> = {
    playing: 'Playing',
    completed: 'Completed',
    backlog: 'Want to Play',
    onhold: 'On Hold',
    dropped: 'Dropped',
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-white"
      style={{
        backgroundColor: STATUS_COLORS[status],
        borderRadius: 2,
        fontFamily: FONT_MONO,
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {label || statusLabels[status]}
    </span>
  );
}
