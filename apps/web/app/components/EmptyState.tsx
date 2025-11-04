import { ReactNode } from 'react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-[var(--bkl-color-text-disabled)] mb-4">
        {icon}
      </div>
      <h3 
        className="text-[var(--bkl-color-text-primary)] mb-2"
        style={{ fontSize: 'var(--bkl-font-size-xl)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
      >
        {title}
      </h3>
      <p 
        className="text-[var(--bkl-color-text-secondary)] max-w-md mb-6"
        style={{ fontSize: 'var(--bkl-font-size-sm)' }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] hover:bg-[var(--bkl-color-accent-hover)] px-[var(--bkl-space-6)] py-[var(--bkl-space-3)] rounded-[var(--bkl-radius-md)] shadow-[var(--bkl-shadow-md)] transition-all hover:shadow-[var(--bkl-shadow-glow)]"
          style={{ fontSize: 'var(--bkl-font-size-base)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
