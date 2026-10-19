"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { ResubmitForm } from "@/components/ui/resubmit-form";
import { fr } from "@/lib/i18n/fr";
import { decideBriefOut, sendBriefOut } from "@/lib/strategy/actions/brief-out";

const t = fr.strategyBriefOut;

/**
 * « Votre décision » on the Brief de sortie (proto stdecide), for a
 * validator still to answer: the comment is required for reserves or a
 * change.
 */
export function BriefDecision({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-hairline)] p-3.5">
      <DecisionPanel
        id="brief-decision"
        commentHint={t.decision.hint}
        outcomes={[
          {
            kind: "approve",
            label: t.decision.approve,
            done: t.decision.done.approve,
          },
          {
            kind: "approve_reserves",
            label: t.decision.reserves,
            done: t.decision.done.reserves,
          },
          {
            kind: "request_changes",
            label: t.decision.changes,
            done: t.decision.done.changes,
          },
        ]}
        onDecide={(kind, comment) =>
          decideBriefOut(
            projectId,
            documentId,
            kind === "approve_reserves" || kind === "request_changes"
              ? kind
              : "approve",
            comment,
          )
        }
      />
    </section>
  );
}

/**
 * « Votre réponse * » + « Répondre et transmettre à nouveau » (proto
 * stresend): the next version goes to the same validators, with the answer.
 */
export function BriefResubmit({
  projectId,
  creativeIds,
}: {
  projectId: string;
  creativeIds: string[];
}) {
  return (
    <ResubmitForm
      id="brief-resubmit"
      label={t.resubmit.label}
      done={t.resubmit.done}
      onResubmit={(answer) =>
        sendBriefOut(projectId, creativeIds, answer, t.resubmit.done)
      }
    />
  );
}
