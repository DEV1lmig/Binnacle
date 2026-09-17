import { ReactNode } from "react";
import { Pill } from "@/app/components/playchive";

export function EmptyState({ icon, title, description, actionLabel, onAction, actionHref }: {
  icon: ReactNode; title: string; description: string; actionLabel?: string; onAction?: () => void; actionHref?: string;
}) {
  return (
    <div className="pk-empty">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionHref && <Pill href={actionHref} tone="gold" size="sm">{actionLabel}</Pill>}
      {actionLabel && !actionHref && onAction && <Pill tone="gold" size="sm" onClick={onAction}>{actionLabel}</Pill>}
    </div>
  );
}
