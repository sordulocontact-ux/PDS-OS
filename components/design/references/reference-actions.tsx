"use client";

import { IconLink, IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AttachReferenceDialog,
  EditReferenceDialog,
} from "@/components/design/references/reference-edit-dialogs";
import type { TargetOption } from "@/components/design/references/target-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { removeReference } from "@/lib/design/actions/reference-links";
import { fr } from "@/lib/i18n/fr";

export type EditableReference = {
  id: string;
  name: string;
  title: string | null;
  note: string | null;
  // Target keys it serves (« direction » or a deliverable id).
  targets: string[];
  // MKT-C2-09: what it is, its rights of use, its moodboard.
  type: "reference" | "moodboard" | "to_qualify";
  usage: string | null;
  moodboardId: string | null;
};

/** « ⋯ » of a reference: attach it to targets, edit it, take it back. */
export function ReferenceActions({
  projectId,
  reference,
  options,
  moodboards = [],
}: {
  projectId: string;
  reference: EditableReference;
  options: TargetOption[];
  // The project's moodboards, to put the reference in one.
  moodboards?: Array<{ id: string; label: string }>;
}) {
  const t = fr.conceptionRefs;
  const [open, setOpen] = useState<"attach" | "edit" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = () => setOpen(null);

  return (
    <>
      <RowActions
        label={t.actions.label(reference.name)}
        actions={[
          {
            key: "attach",
            label: t.actions.attach,
            icon: IconLink,
            onSelect: () => setOpen("attach"),
          },
          {
            key: "edit",
            label: t.actions.edit,
            icon: IconPenWriting2,
            onSelect: () => setOpen("edit"),
          },
          {
            key: "remove",
            label: t.actions.remove,
            icon: IconTrash,
            onSelect: () => {
              setError(null);
              setOpen("remove");
            },
          },
        ]}
      />
      <AttachReferenceDialog
        open={open === "attach"}
        onClose={close}
        projectId={projectId}
        reference={reference}
        options={options}
      />
      <EditReferenceDialog
        open={open === "edit"}
        onClose={close}
        projectId={projectId}
        reference={reference}
        moodboards={moodboards}
      />
      <ConfirmDialog
        open={open === "remove"}
        onOpenChange={(next) => !next && close()}
        title={t.remove.title}
        description={t.remove.body}
        cancelLabel={t.add.cancel}
        closeLabel={t.add.close}
        confirmLabel={t.remove.confirm}
        pendingLabel={t.remove.pending}
        pending={pending}
        destructive
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await removeReference(projectId, reference.id);
            if (!result.ok) return setError(result.error);
            toast.success(t.remove.done);
            close();
          })
        }
      />
    </>
  );
}
