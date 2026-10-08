/** A thin progress bar (how much is done of a whole): announced as a
 * progressbar, filled in ink, moved by transform only. */
export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  // Said to assistive technologies (« 3 sur 5 confirmés »).
  label: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
    >
      <div
        className="h-full origin-left rounded-full bg-foreground transition-transform duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
