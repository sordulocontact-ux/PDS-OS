"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { useDeleteRecords } from "@/components/archive/use-delete-records";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { setArchived } from "@/lib/archive/actions";
import type { ArchiveKind, RecordRights } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";

type Open = "none" | "edit" | "archive" | "delete";

// "⋯" of an artist, a master, a project or a contact: Modifier (the real form
// in the design system's modal), Archiver or Restaurer, Supprimer (confirmed,
// definitive). The database decides; a reason known in advance
// (`blockedReason`, `deleteBlockedReason`) is explained instead of asked.
export function RecordActions({
  kind,
  id,
  name,
  rights,
  blockedReason,
  deleteBlockedReason,
  edit,
  leaveTo,
  size,
}: {
  kind: ArchiveKind;
  id: string;
  name: string;
  rights: RecordRights;
  blockedReason?: string;
  deleteBlockedReason?: string;
  // Body of the edit modal; absent = not editable here.
  edit?: (close: () => void) => ReactNode;
  // Detail page: where to go once the record is archived or deleted.
  leaveTo?: string;
  size?: "icon-sm" | "icon-lg";
}) {
  const t = fr.records;
  const router = useRouter();
  const [open, setOpen] = useState<Open>("none");
  const [pending, startTransition] = useTransition();
  const deletion = useDeleteRecords(kind);
  const close = () => setOpen("none");
  const restoring = rights.archived;

  const actions: RowAction[] = [];
  if (edit && rights.canEdit && !restoring) {
    actions.push({
      key: "edit",
      label: t.menu.edit,
      icon: IconPenWriting2,
      onSelect: () => setOpen("edit"),
    });
  }
  if (rights.canArchive) {
    actions.push({
      key: "archive",
      label: restoring ? t.menu.restore : t.menu.archive,
      icon: restoring ? IconArrowDottedRotateAnticlockwise : IconBoxArchive,
      onSelect: () => setOpen("archive"),
    });
    // Same permission: the director archives or deletes, live or archived.
    actions.push({
      key: "delete",
      label: t.menu.delete,
      icon: IconTrash,
      onSelect: () => setOpen("delete"),
    });
  }

  function confirm() {
    startTransition(async () => {
      const result = await setArchived(kind, id, !restoring);
      if (!result.ok) {
        toast.error(t.errors[result.error]);
        return;
      }
      toast.success(restoring ? t.restore.done : t.archive.done);
      close();
      if (leaveTo && !restoring) router.replace(leaveTo);
    });
  }

  function confirmDelete() {
    deletion.remove([{ id, name }], (deleted) => {
      if (!deleted.includes(id)) return;
      close();
      if (leaveTo) router.replace(leaveTo);
    });
  }

  const blocked = !restoring ? blockedReason : undefined;

  return (
    <>
      <RowActions label={t.menu.label(name)} actions={actions} size={size} />

      {edit && (
        <FormDialog
          open={open === "edit"}
          onOpenChange={(next) => !next && close()}
          title={t.edit.title[kind]}
          description={t.edit.description[kind]}
          closeLabel={t.edit.close}
        >
          {edit(close)}
        </FormDialog>
      )}

      <ConfirmDialog
        open={open === "archive"}
        onOpenChange={(next) => !next && !pending && close()}
        title={
          blocked
            ? t.archive.blockedTitle(name)
            : restoring
              ? t.restore.title(name)
              : t.archive.title(name)
        }
        description={
          blocked ?? (restoring ? t.restore.body[kind] : t.archive.body[kind])
        }
        cancelLabel={blocked ? t.archive.understood : t.cancel}
        closeLabel={t.edit.close}
        confirmLabel={restoring ? t.restore.confirm : t.archive.confirm}
        pendingLabel={restoring ? t.restore.pending : t.archive.pending}
        pending={pending}
        onConfirm={blocked ? undefined : confirm}
      />

      <ConfirmDialog
        open={open === "delete"}
        onOpenChange={(next) => !next && !deletion.pending && close()}
        title={
          deleteBlockedReason
            ? t.delete.blockedTitle(name)
            : t.delete.title(name)
        }
        description={deleteBlockedReason ?? t.delete.body[kind]}
        cancelLabel={deleteBlockedReason ? t.archive.understood : t.cancel}
        closeLabel={t.edit.close}
        confirmLabel={t.delete.confirm}
        pendingLabel={t.delete.pending}
        pending={deletion.pending}
        destructive
        onConfirm={deleteBlockedReason ? undefined : confirmDelete}
      />
    </>
  );
}
