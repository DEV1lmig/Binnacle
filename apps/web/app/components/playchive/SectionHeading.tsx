import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/** Eyebrow + display title with an optional text-link action or a custom right slot. */
export function SectionHeading({ eyebrow, title, description, action, children }: {
  eyebrow?: ReactNode; title: ReactNode; description?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void }; children?: ReactNode;
}) {
  return (
    <div className="pk-section">
      <div>
        {eyebrow && <span className="pk-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
      {action && (action.href
        ? <Link className="pk-textlink" href={action.href}>{action.label}<ArrowRight size={16} /></Link>
        : <button type="button" className="pk-textlink" onClick={action.onClick}>{action.label}<ArrowRight size={16} /></button>)}
    </div>
  );
}
