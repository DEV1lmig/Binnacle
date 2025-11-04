interface StatusBadgeProps {
  status: 'playing' | 'completed' | 'backlog' | 'onhold' | 'dropped';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    playing: {
      bg: 'var(--bkl-color-status-playing)',
      label: label || 'Playing',
    },
    completed: {
      bg: 'var(--bkl-color-status-completed)',
      label: label || 'Completed',
    },
    backlog: {
      bg: 'var(--bkl-color-status-backlog)',
      label: label || 'Want to Play',
    },
    onhold: {
      bg: 'var(--bkl-color-status-onhold)',
      label: label || 'On Hold',
    },
    dropped: {
      bg: 'var(--bkl-color-status-dropped)',
      label: label || 'Dropped',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className="inline-flex items-center px-[var(--bkl-space-3)] py-[var(--bkl-space-1)] rounded-[var(--bkl-radius-full)] text-[var(--bkl-color-white)]"
      style={{
        backgroundColor: config.bg,
        fontSize: 'var(--bkl-font-size-xs)',
        fontWeight: 'var(--bkl-font-weight-medium)',
      }}
    >
      {config.label}
    </span>
  );
}