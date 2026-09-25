import type { QuoteLocation } from "@/lib/ai/provenance";
import { fr } from "@/lib/i18n/fr";
import { formatTimestamp } from "@/lib/labo/format";

/** Where an extracted item comes from, as located by code — never by the model. */
export function ProvenanceTag({
  at,
  quote,
}: {
  at: QuoteLocation;
  quote: string;
}) {
  const t = fr.labo.report;
  const label =
    at.status === "timed"
      ? formatTimestamp(at.start)
      : at.status === "found"
        ? t.quoteUntimed
        : t.quoteMissing;

  return (
    <span className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      <span
        className={
          at.status === "missing"
            ? "font-medium text-destructive"
            : "font-mono text-foreground"
        }
      >
        {label}
      </span>
      <q className="italic">{quote}</q>
    </span>
  );
}
