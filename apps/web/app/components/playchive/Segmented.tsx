"use client";

/** Pill-rail tab switcher. Accessible as a tablist; counts render as small suffixes. */
export function Segmented<T extends string>({ value, onChange, options, label, tone, scroll }: {
  value: T; onChange: (value: T) => void; label: string; tone?: "gold" | "cobalt"; scroll?: boolean;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="pk-seg" role="tablist" aria-label={label} data-scroll={scroll || undefined}>
      {options.map(option => (
        <button key={option.value} type="button" role="tab" aria-selected={value === option.value} data-tone={tone} onClick={() => onChange(option.value)}>
          {option.label}{option.count !== undefined && <small>{option.count}</small>}
        </button>
      ))}
    </div>
  );
}
