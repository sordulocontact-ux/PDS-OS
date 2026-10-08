import { ProgressBar } from "@/components/ui/progress-bar";
import { fr } from "@/lib/i18n/fr";

/** How much of the Cadrage is confirmed, in words and as a bar. */
export function FramingProgress({
  known,
  total,
}: {
  known: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground tabular-nums">
        {fr.framingIntel.progress(known, total)}
      </p>
      <ProgressBar
        value={known}
        max={total}
        label={fr.framingIntel.progress(known, total)}
      />
    </div>
  );
}
