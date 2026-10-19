"use client";

import {
  DecisionPanel,
  type DecisionOutcomeKind,
} from "@/components/ui/decision-panel";
import { fr } from "@/lib/i18n/fr";
import { decideReport } from "@/lib/marketing/reports/approval-actions";
import type { ApprovalDecision } from "@/lib/marketing/reports/model";

const t = fr.reviewJourney.bilan.decision;

// The panel's outcomes, said with this step's words (proto `bdecide`).
const DECISION: Partial<Record<DecisionOutcomeKind, ApprovalDecision>> = {
  approve: "approved_provisional",
  request_changes: "changes_requested",
  request_info: "postponed",
};

/**
 * « Votre décision » on the version submitted (proto `bi1`, direction):
 * approve the provisional bilan (with reserves when it has some), ask for
 * corrections or postpone, a reason required for the last two.
 */
export function ReportDecision({
  projectId,
  reportId,
  version,
  withReserves,
}: {
  projectId: string;
  reportId: string;
  version: number;
  withReserves: boolean;
}) {
  return (
    <DecisionPanel
      id="bilan-decision"
      commentHint={null}
      commentPlaceholder={t.placeholder}
      commentRequired={t.required}
      outcomes={[
        {
          kind: "approve",
          label: withReserves ? t.approveWithReserves : t.approve,
          done: t.approved,
        },
        { kind: "request_changes", label: t.changes, done: t.changesDone },
        { kind: "request_info", label: t.postpone, done: t.postponed },
      ]}
      onDecide={(kind, comment) =>
        decideReport({
          projectId,
          reportId,
          version,
          decision: DECISION[kind] ?? "changes_requested",
          comment,
        })
      }
    />
  );
}
