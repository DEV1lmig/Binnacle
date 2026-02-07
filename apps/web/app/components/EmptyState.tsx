import { ReactNode } from 'react';
import { Button } from './ui/button';
import { C, FONT_HEADING, FONT_BODY, FONT_MONO } from '@/app/lib/design-system';

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
      <div className="mb-4" style={{ color: C.textDim }}>
        {icon}
      </div>
      <h3
        className="mb-2"
        style={{
          color: C.text,
          fontFamily: FONT_HEADING,
          fontSize: '1.25rem',
          fontWeight: 300,
        }}
      >
        {title}
      </h3>
      <p
        className="max-w-md mb-6"
        style={{
          color: C.textMuted,
          fontFamily: FONT_BODY,
          fontSize: 14,
          fontWeight: 300,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="px-6 py-2.5 text-white transition-all"
          style={{
            backgroundColor: C.gold,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: `0 0 20px ${C.bloom}`,
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
