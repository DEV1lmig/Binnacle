/** Big rating numeral out of ten with a thin gauge underneath. */
export function ScoreMark({ value, size, label }: { value: number; size?: "sm"; label?: string }) {
  const score = Math.max(0, Math.min(10, value));
  return (
    <div className="pk-score" data-size={size} aria-label={label ?? `Rated ${score.toFixed(1)} out of 10`} role="img">
      <span className="pk-score-num">{score.toFixed(1)}<small>/10</small></span>
      <span className="pk-score-bar" aria-hidden="true"><i style={{ "--v": score / 10 } as React.CSSProperties} /></span>
    </div>
  );
}
