import { sourceLabel } from "@/components/framing/guide/source-quote";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";

/** AI Act transparency: every value suggested by PO is marked until
 * confirmed, with where it comes from when known (initial context,
 * dictation, call), never a call by default. */
export function ProposedBadge({
  provenance = null,
}: {
  provenance?: Provenance | null;
}) {
  return (
    <StatusBadge
      tone={reviewTone.proposed}
      size="sm"
      title={
        provenance
          ? fr.framing.proposedFrom(sourceLabel(provenance))
          : fr.framing.proposedHint
      }
    >
      {fr.framing.proposed}
    </StatusBadge>
  );
}
