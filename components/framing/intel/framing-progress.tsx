import { ProgressBar } from "@/components/ui/progress-bar";
import { fr } from "@/lib/i18n/fr";

/** How much of the Cadrage is confirmed, in words and as a bar. */
export function FramingProgress({
  known,
  total,
  optionalEmpty = 0,
}: {
  known: number;
  total: number;
  // Optional questions still empty: said next to the count.
  optionalEmpty?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground tabular-nums">
        {fr.framingIntel.progress(known, total, optionalEmpty)}
      </p>
      <ProgressBar
        value={known}
        max={total}
        label={fr.framingIntel.progress(known, total, optionalEmpty)}
      />
    </div>
  );
}
