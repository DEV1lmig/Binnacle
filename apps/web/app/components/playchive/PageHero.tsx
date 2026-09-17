import type { ReactNode } from "react";

export type Tone = "night" | "surface" | "cobalt" | "gold" | "orange";

/**
 * Full-bleed page header in one brand family. `title` may include <em> for the accent word.
 * `strip` renders below a hairline (stats, filters); `aside` sits at the right (actions).
 */
export function PageHero({ tone = "cobalt", eyebrow, title, lede, aside, strip, compact = false, children }: {
  tone?: Tone; eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; aside?: ReactNode; strip?: ReactNode; compact?: boolean; children?: ReactNode;
}) {
  return (
    <section className="pk-hero" data-tone={tone} data-compact={compact || undefined}>
      <div className="pk-hero-inner">
        <div>
          {eyebrow && <span className="pk-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {lede && <p className="pk-hero-lede">{lede}</p>}
          {children}
        </div>
        {aside && <div className="pk-hero-actions">{aside}</div>}
        {strip && <div className="pk-hero-strip">{strip}</div>}
      </div>
    </section>
  );
}
