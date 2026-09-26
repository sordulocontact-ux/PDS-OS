import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";

/** AI Act transparency: every value suggested by PO is marked until confirmed. */
export function ProposedBadge() {
  return (
    <StatusBadge
      tone={reviewTone.proposed}
      size="sm"
      title={fr.framing.proposedHint}
    >
      {fr.framing.proposed}
    </StatusBadge>
  );
}
