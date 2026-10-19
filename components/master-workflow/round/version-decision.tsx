"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import { decideRound, reopenMix } from "@/lib/master-workflow/round-actions";

const t = fr.masterRound;

/** « Valider ce mix » / « Demander une modification » (the validator, the
 * latest version undecided; the comment always said, rule 6). */
export function VersionDecision({
  projectId,
  versionId,
  label,
  engineer,
  working,
}: {
  projectId: string;
  versionId: string;
  label: string;
  engineer: string;
  // Made on a working version: it cannot become the final.
  working: boolean;
}) {
  return (
    <DecisionPanel
      id={`decision-${versionId}`}
      title={t.decision.title}
      commentLabel={t.decision.comment}
      commentHint={t.decision.commentHint(engineer)}
      commentRequired={t.decision.commentRequired(engineer)}
      outcomes={[
        ...(working
          ? []
          : [
              {
                kind: "approve" as const,
                label: t.decision.approve(label),
                done: t.decision.approved(label),
              },
            ]),
        {
          kind: "request_changes" as const,
          label: t.decision.changes,
          done: t.decision.changed,
        },
      ]}
      onDecide={(kind, comment) =>
        decideRound(
          projectId,
          versionId,
          kind === "approve" ? "approved" : "changes_requested",
          comment,
          kind === "approve" ? t.decision.approved(label) : t.decision.changed,
        )
      }
    />
  );
}

/** « Rouvrir le mix » (the owner, before the mastering), its reason said. */
export function ReopenMix({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button
        variant="outline"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {t.reopen.button}
      </Button>
    );
  return (
    <ReasonForm
      label={t.reopen.reason}
      hint={t.reopen.hint}
      submitLabel={t.reopen.button}
      doneMessage={t.reopen.done}
      run={(reason) => reopenMix(projectId, versionId, reason)}
      onDone={() => setOpen(false)}
    />
  );
}
