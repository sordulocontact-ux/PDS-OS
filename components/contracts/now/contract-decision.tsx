"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { advanceContract } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** The direction's decision on a contract to validate: Valider, or
 * Demander des modifications with a comment (red at the first try). */
export function ContractDecision({ contractId }: { contractId: string }) {
  const t = fr.contracts.now;
  return (
    <DecisionPanel
      id={`contract-${contractId}`}
      title={null}
      commentLabel={t.decide.comment}
      commentHint={t.decide.commentHint}
      commentPlaceholder={t.decide.commentPlaceholder}
      commentRequired={t.decide.commentRequired}
      outcomes={[
        { kind: "approve", label: t.decide.approve, done: t.done.approve },
        {
          kind: "request_changes",
          label: t.decide.requestChanges,
          done: t.done.request_changes,
        },
      ]}
      onDecide={(kind, comment) =>
        advanceContract({
          contractId,
          action: kind === "approve" ? "approve" : "request_changes",
          comment: comment || undefined,
        })
      }
    />
  );
}
