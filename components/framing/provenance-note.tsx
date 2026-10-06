import { StatusBadge } from "@/components/ui/status-badge";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

/**
 * Where a value comes from is already implied by context (a proposed field
 * sits next to the call it was pulled from); repeating the source, the exact
 * timecode or the quote here would only restate what the screen already
 * shows. The one thing worth a signal is when the quote could not be
 * relocated in the transcription: that changes what the reader should do
 * before confirming, so it stays.
 */
export function ProvenanceNote({
  provenance,
}: {
  provenance: Provenance | null;
}) {
  const t = fr.framing.provenance;
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
