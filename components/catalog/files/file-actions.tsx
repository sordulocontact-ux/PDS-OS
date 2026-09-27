"use client";

import {
  IconEyeOpen,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { FileEditForm } from "@/components/catalog/files/file-edit-form";
import { IconDownload } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import type { CatalogFile, FileOwner } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

// "⋯" of a file: open it in a new tab (the browser previews PDFs, images,
// sounds), download it under its name, then for manage_catalog edit it
// (name, category, precision) and delete it after confirmation.
export function FileActions({
  owner,
  file,
  canEdit,
  canDelete,
}: {
  owner: FileOwner;
  file: CatalogFile;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const t = fr.catalogFiles;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function closeDelete() {
    setError(null);
    setDeleting(false);
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteCatalogFile({ owner, fileId: file.id });
      if (result.ok) closeDelete();
      else setError(result.error);
    });
  }

  const { openUrl, downloadUrl } = file;
  const actions: RowAction[] = [
    ...(openUrl
      ? [
          {
            key: "open",
            label: t.menu.open,
            icon: IconEyeOpen,
            onSelect: () => window.open(openUrl, "_blank", "noopener"),
          },
        ]
      : []),
    ...(downloadUrl
      ? [
          {
            key: "download",
            label: t.menu.download,
            icon: IconDownload,
            // Served as an attachment: the page stays.
            onSelect: () => window.location.assign(downloadUrl),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            key: "edit",
            label: t.menu.edit,
            icon: IconPenWriting2,
            onSelect: () => setEditing(true),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: t.menu.remove,
            icon: IconTrash,
            onSelect: () => setDeleting(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <RowActions label={t.menu.label(file.fileName)} actions={actions} />
      {canEdit && (
        <FormDialog
          open={editing}
          onOpenChange={setEditing}
          title={t.edit.title}
          description={t.edit.description}
          closeLabel={t.close}
        >
          <FileEditForm
            owner={owner}
            file={file}
            onDone={() => setEditing(false)}
          />
        </FormDialog>
      )}
      {canDelete && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={(open) => !open && closeDelete()}
          title={t.confirmTitle}
          description={t.confirmBody(file.fileName)}
          cancelLabel={t.cancel}
          closeLabel={t.close}
          confirmLabel={t.confirm}
          pendingLabel={t.deleting}
          pending={pending}
          destructive
          error={error}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
