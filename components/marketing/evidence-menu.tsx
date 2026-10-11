"use client";

import {
  IconBoxArchive,
  IconCheck,
  IconLink,
  IconPenWriting2,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EvidenceForm } from "@/components/marketing/evidence-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { IconRefresh } from "@/components/icons";
import { fr } from "@/lib/i18n/fr";
import { changeEvidence } from "@/lib/marketing/actions/activations";
import type { Evidence } from "@/lib/marketing/model";

const t = fr.marketing.evidence;

type Change =
  | "verified"
  | "to_verify"
  | "declared"
  | "unreachable"
  | "reachable"
  | "archive";

/**
 * The « ⋯ » of an evidence: modify, verify (confirmed: the person says they
 * checked it themselves), ask for a check, flag an unreachable link (the
 * evidence and its past check are kept), archive.
 */
export function EvidenceMenu({
  projectId,
  evidence,
}: {
  projectId: string;
  evidence: Evidence;
}) {
  const [dialog, setDialog] = useState<"edit" | "verify" | "archive" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const e = evidence;

  const apply = (change: Change, inDialog = false) =>
    startTransition(async () => {
      const result = await changeEvidence({ projectId, id: e.id, change });
      if (!result.ok) {
        if (inDialog) setError(result.error);
        else toast.error(result.error);
        return;
      }
      toast.success(change === "archive" ? t.archivedDone : t.updated);
      setDialog(null);
    });

  const canVerify =
    e.verification !== "verified" &&
    (e.kind !== "publication" || e.url !== null) &&
    e.availability !== "unavailable";
  const actions: RowAction[] = [
    {
      key: "edit",
      label: fr.marketing.activations.edit,
      icon: IconPenWriting2,
      onSelect: () => setDialog("edit"),
    },
    ...(canVerify
      ? [
          {
            key: "verify",
            label: t.verify,
            icon: IconCheck,
            onSelect: () => setDialog("verify"),
          },
        ]
      : []),
    ...(e.verification === "declared"
      ? [
          {
            key: "to_verify",
            label: t.toVerify,
            icon: IconRefresh,
            onSelect: () => apply("to_verify"),
          },
        ]
      : [
          {
            key: "declared",
            label: t.unverify,
            icon: IconRefresh,
            onSelect: () => apply("declared"),
          },
        ]),
    ...(e.url
      ? [
          e.linkUnreachableAt
            ? {
                key: "reachable",
                label: t.linkBack,
                icon: IconLink,
                onSelect: () => apply("reachable"),
              }
            : {
                key: "unreachable",
                label: t.reportUnreachable,
                icon: IconLink,
                onSelect: () => apply("unreachable"),
              },
        ]
      : []),
    {
      key: "archive",
      label: t.archive,
      icon: IconBoxArchive,
      onSelect: () => setDialog("archive"),
    },
  ];

  const confirm = (kind: "verify" | "archive") => (
    <ConfirmDialog
      open={dialog === kind}
      onOpenChange={(open) => {
        setError(null);
        if (!open) setDialog(null);
      }}
      title={kind === "verify" ? t.verifyTitle : t.archiveTitle}
      description={kind === "verify" ? t.verifyBody : t.archiveBody}
      cancelLabel={fr.dialogs.cancel}
      closeLabel={fr.dialogs.close}
      confirmLabel={kind === "verify" ? t.verifyConfirm : t.archive}
      pendingLabel={t.working}
      pending={pending}
      error={error}
      onConfirm={() => apply(kind === "verify" ? "verified" : "archive", true)}
    />
  );

  return (
    <>
      <RowActions label={t.menu(e.label)} actions={actions} />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t.editTitle}
        description={t.addBody}
        closeLabel={fr.dialogs.close}
      >
        <EvidenceForm
          projectId={projectId}
          activationId={e.activationId}
          kind={e.kind}
          evidence={e}
          onDone={() => setDialog(null)}
        />
      </FormDialog>
      {confirm("verify")}
      {confirm("archive")}
    </>
  );
}
