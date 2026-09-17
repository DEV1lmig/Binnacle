import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Pill, type PillTone } from "./Pill";
import type { Tone } from "./PageHero";

const CTA_TONE: Record<Tone, PillTone> = { night: "gold", surface: "cobalt", cobalt: "gold", gold: "ink", orange: "ink" };

/** Flooded call-to-action tile in one brand family. */
export function Prompt({ tone = "orange", eyebrow, title, text, href, cta, className = "" }: {
  tone?: Tone; eyebrow?: ReactNode; title: ReactNode; text?: ReactNode; href: string; cta: string; className?: string;
}) {
  return (
    <aside className={`pk-prompt ${className}`} data-tone={tone}>
      <div>
        {eyebrow && <span className="pk-eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
        {text && <p className="mt-2">{text}</p>}
      </div>
      <Pill href={href} tone={CTA_TONE[tone]} size="sm">{cta}<ArrowRight size={15} /></Pill>
    </aside>
  );
}
