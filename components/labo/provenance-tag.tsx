import { StatusBadge } from "@/components/ui/status-badge";
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
      {at.status === "missing" ? (
        // A quote absent from the transcript is a block: probably invented.
        <StatusBadge
          treatment="blocked"
          size="sm"
          className="justify-self-start"
        >
          {label}
        </StatusBadge>
      ) : (
        <span className="font-mono text-foreground">{label}</span>
      )}
      <q>{quote}</q>
    </span>
  );
}
