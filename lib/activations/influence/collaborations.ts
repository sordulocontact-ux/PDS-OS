import "server-only";

import type { InfluenceData } from "@/lib/activations/influence/queries";
import {
  collaborationStage,
  type CollaborationStage,
} from "@/lib/activations/influence/stage";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import type { SheetVersion } from "@/lib/activations/sheets";
import type { TargetRecord } from "@/lib/activations/targets";
import type { EvidenceRecord } from "@/lib/activations/types";

export type CollaborationRow = TargetRecord & {
  stage: CollaborationStage;
  publication: "none" | "declared" | "verified";
};

/** Each collaboration with the step its objects prove. */
export function collaborationRows(
  targets: TargetRecord[],
  sheets: SheetVersion[],
  messages: MessageRecord[],
  influence: InfluenceData,
  evidences: EvidenceRecord[],
): CollaborationRow[] {
  return targets.map((t) => {
    const mineMessages = messages.filter((m) => m.targetId === t.id);
    const live = evidences.filter(
      (e) => e.targetId === t.id && e.kind === "publication" && !e.withdrawnAt,
    );
    const publication = live.some((e) => e.checks[0]?.result === "verified")
      ? "verified"
      : live.length > 0
        ? "declared"
        : "none";
    const stage = collaborationStage({
      outcome: t.outcome,
      conceptStatus:
        sheets.find((s) => s.kind === "concept" && s.targetId === t.id)
          ?.status ?? null,
      messagePrepared: mineMessages.some((m) =>
        ["draft", "to_validate", "validated"].includes(m.status),
      ),
      messageSent: mineMessages.some((m) => m.status === "sent_declared"),
      proposals: influence.proposals
        .filter((p) => p.target_id === t.id)
        .map((p) => ({ acceptedAt: p.accepted_at })),
      agreementAccepted: influence.agreements.some(
        (g) => g.target_id === t.id && g.status === "accepted",
      ),
      contents: influence.contents
        .filter((c) => c.target_id === t.id)
        .map((c) => ({ decision: c.decision })),
      publication,
      paymentStatus:
        influence.payments.find((p) => p.target_id === t.id)?.status ?? null,
    });
    return { ...t, stage, publication };
  });
}
