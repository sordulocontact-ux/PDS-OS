"use client";

import { useState } from "react";

import { IconRefresh } from "@/components/icons";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions } from "@/components/ui/row-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { decideRound, reopenMix } from "@/lib/master-workflow/round-actions";

const fr = { dialogs, masterRound };

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

/**
 * « Rouvrir le mix / le master » in the « ⋯ » of the validated version
 * (Ibé, 04/11/2026: the validated mix's page keeps only the essential),
 * its reason asked in a modal (rule 6).
 */
export function ReopenMenu({
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
  return (
    <>
      <RowActions
        label={t.reopen.menu}
        actions={[
          {
            key: "reopen",
            label: r.button,
            icon: IconRefresh,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={r.button}
        description={r.hint}
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={r.reason}
          submitLabel={r.button}
          doneMessage={r.done}
          run={(reason) => reopenMix(projectId, versionId, reason, stage)}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
