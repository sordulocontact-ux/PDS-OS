"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { ReasonForm } from "@/components/ui/reason-form";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { decideRound, reopenMix } from "@/lib/master-workflow/round-actions";

const fr = { masterRound };

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

/** « Rouvrir le mix » (the owner, before the mastering) or « Rouvrir le
 * master » (before the Distribution delivered), its reason said. */
export function ReopenMix({
  projectId,
  versionId,
  stage = "mix",
}: {
  projectId: string;
  versionId: string;
  stage?: "mix" | "mastering";
}) {
  const [open, setOpen] = useState(false);
  const r = stage === "mix" ? t.reopen : t.reopen.master;
  if (!open)
    return (
      <Button
        variant="outline"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {r.button}
      </Button>
    );
  return (
    <ReasonForm
      label={r.reason}
      hint={r.hint}
      submitLabel={r.button}
      doneMessage={r.done}
      run={(reason) => reopenMix(projectId, versionId, reason, stage)}
      onDone={() => setOpen(false)}
    />
  );
}
