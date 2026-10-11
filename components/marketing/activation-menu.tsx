"use client";

import {
  IconBoxArchive,
  IconArrowDottedRotateAnticlockwise,
  IconPenWriting2,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  ActivationForm,
  type ActivationFormOptions,
} from "@/components/marketing/activation-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";
import { setActivationArchived } from "@/lib/marketing/actions/activations";
import type { Activation } from "@/lib/marketing/model";

const t = fr.marketing.activations;

/** The « ⋯ » of an activation: « Modifier », « Archiver » (confirmed, never
 * a deletion) or « Restaurer ». Nothing for a reader. */
export function ActivationMenu({
  projectId,
  activation,
  options,
  size,
}: {
  projectId: string;
  activation: Activation;
  options: ActivationFormOptions;
  size?: "icon-sm" | "icon-lg";
}) {
  const [dialog, setDialog] = useState<"edit" | "archive" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const archived = activation.archivedAt !== null;

  const setArchived = (value: boolean, onDone?: () => void) =>
    startTransition(async () => {
      const result = await setActivationArchived({
        projectId,
        id: activation.id,
        archived: value,
      });
      if (!result.ok) {
        if (onDone) setError(result.error);
        else toast.error(result.error);
        return;
      }
      toast.success(value ? t.archivedDone : t.restoredDone);
      onDone?.();
    });

  const actions: RowAction[] = archived
    ? [
        {
          key: "restore",
          label: t.restore,
          icon: IconArrowDottedRotateAnticlockwise,
          onSelect: () => setArchived(false),
        },
      ]
    : [
        {
          key: "edit",
          label: t.edit,
          icon: IconPenWriting2,
          onSelect: () => setDialog("edit"),
        },
        {
          key: "archive",
          label: t.archive,
          icon: IconBoxArchive,
          onSelect: () => setDialog("archive"),
        },
      ];

  return (
    <>
      <RowActions
        label={t.rowMenu(activation.title)}
        actions={actions}
        size={size}
      />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t.editTitle}
        description={t.editBody}
        closeLabel={fr.dialogs.close}
      >
        <ActivationForm
          projectId={projectId}
          activation={activation}
          options={options}
          onDone={() => setDialog(null)}
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(open) => {
          setError(null);
          if (!open) setDialog(null);
        }}
        title={t.archiveTitle}
        description={t.archiveBody}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.archiveConfirm}
        pendingLabel={t.archiving}
        pending={pending}
        error={error}
        onConfirm={() => setArchived(true, () => setDialog(null))}
      />
    </>
  );
}
