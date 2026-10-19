"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { decideDesignStep } from "@/lib/design/actions/decide";

/**
 * The direction's decision on a submitted version of the direction or of a
 * sheet (proto « Votre décision »): Valider … / Demander des modifications
 * / Refuser, the comment required but for « Valider ».
 */
export function DesignDecision({
  id,
  projectId,
  submissionId,
  title,
  labels,
  commentLabel,
  commentHint,
  commentRequired,
}: {
  id: string;
  projectId: string;
  submissionId: string;
  title: string | null;
  labels: {
    approve: string;
    changes: string;
    refuse: string;
    approved: string;
    changed: string;
    refused: string;
  };
  commentLabel: string;
  commentHint: string;
  commentRequired: string;
}) {
  const done = {
    approve: labels.approved,
    request_changes: labels.changed,
    refuse: labels.refused,
  } as const;
  return (
    <DecisionPanel
      id={id}
      title={title}
      commentLabel={commentLabel}
      commentHint={commentHint}
      commentRequired={commentRequired}
      outcomes={[
        { kind: "approve", label: labels.approve, done: labels.approved },
        {
          kind: "request_changes",
          label: labels.changes,
          done: labels.changed,
        },
        { kind: "refuse", label: labels.refuse, done: labels.refused },
      ]}
      onDecide={(kind, comment) =>
        kind === "approve" || kind === "request_changes" || kind === "refuse"
          ? decideDesignStep({
              projectId,
              submissionId,
              kind,
              comment,
              done: done[kind],
            })
          : Promise.resolve({ ok: false, error: "" })
      }
    />
  );
}
