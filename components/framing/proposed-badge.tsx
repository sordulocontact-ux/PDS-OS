import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { reviewTreatment } from "@/lib/ui/state-treatments";

/** AI Act transparency: every value suggested by PO is marked until confirmed. */
export function ProposedBadge() {
  return (
    <StatusBadge
      treatment={reviewTreatment.proposed}
      size="sm"
      title={fr.framing.proposedHint}
    >
      {fr.framing.proposed}
    </StatusBadge>
  );
}
