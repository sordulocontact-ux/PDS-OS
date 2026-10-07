import { fr } from "@/lib/i18n/fr";

/** How much of the Cadrage is confirmed, in words and as a bar. */
export function FramingProgress({
  known,
  total,
}: {
  known: number;
  total: number;
}) {
  const ratio = total > 0 ? known / total : 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground tabular-nums">
        {fr.framingIntel.progress(known, total)}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={known}
        aria-label={fr.framingIntel.progress(known, total)}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
      >
        <div
          className="h-full origin-left rounded-full bg-foreground transition-transform duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
    </div>
  );
}
