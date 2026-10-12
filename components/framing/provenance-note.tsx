import { sourceLabel } from "@/components/framing/guide/source-quote";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { draftConfidenceTone } from "@/lib/ui/state-tones";

/**
 * Where a value comes from is already implied by context (a proposed field
 * sits next to the call it was pulled from); repeating the source, the exact
 * timecode or the quote here would only restate what the screen already
 * shows. Two things are worth a signal: a quote that could not be relocated
 * in the transcription, and a draft written by PO (MKT-S1-09), said with
 * what it leans on and how sure the code judges it, the quote on hover.
 */
export function ProvenanceNote({
  provenance,
}: {
  provenance: Provenance | null;
}) {
  const t = fr.framing.provenance;
  if (provenance?.kind === "generated")
    return (
      <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        {provenance.confidence && (
          <StatusBadge
            tone={draftConfidenceTone[provenance.confidence]}
            size="sm"
          >
            {t.confidence[provenance.confidence]}
          </StatusBadge>
        )}
        <span
          title={provenance.quote ? `« ${provenance.quote} »` : undefined}
          className="break-words"
        >
          {sourceLabel(provenance)}
        </span>
      </span>
    );
  if (!provenance || provenance.kind !== "call") return null;
  if (provenance.located !== "missing") return null;

  return (
    <StatusBadge
      tone="danger"
      size="sm"
      className="h-auto justify-self-start py-0.5 whitespace-normal"
    >
      {t.missing}
    </StatusBadge>
  );
}
