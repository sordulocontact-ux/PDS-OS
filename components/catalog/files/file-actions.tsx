"use client";

import {
  IconLayers,
  IconPaperclip,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FileEditForm } from "@/components/catalog/files/file-edit-form";
import { fileOpenActions } from "@/components/catalog/files/file-open-actions";
import { FileVersionsDialog } from "@/components/catalog/files/file-versions-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { deleteCatalogFile } from "@/lib/catalog/file-actions";
import type { CatalogFile, FileOwner } from "@/lib/catalog/file-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

// "⋯" of a file: open it in a new tab (the browser previews PDFs, images,
// sounds), download it under its name, see its earlier versions, then for
// its writer add a new version (same category and precision), edit it
// (name, category, precision) and delete it after confirmation.
export function FileActions({
  owner,
  file,
  canEdit,
  canDelete,
  organizationId,
  categories,
}: {
  owner: FileOwner;
  file: CatalogFile;
  canEdit: boolean;
  canDelete: boolean;
  // A scoped writer: the categories she may reclassify into.
  categories?: readonly string[];
  // The writer's organization: where a new version is uploaded.
  organizationId: string | null;
}) {
  const t = fr.catalogFiles;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const canVersion = canEdit && organizationId !== null;

  function addVersion(picked: File) {
    if (!organizationId) return;
    startUpload(async () => {
      const result = await uploadCatalogFile({
        organizationId,
        owner,
        category: file.category,
        description: file.description,
        file: picked,
        replacesId: file.id,
      });
      if (result.ok) toast.success(t.versions.added(file.version + 1));
      else toast.error(result.error);
    });
  }

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

  const actions: RowAction[] = [
    ...fileOpenActions(file),
    ...(file.versions.length > 1
      ? [
          {
            key: "versions",
            label: t.menu.versions(file.versions.length),
            icon: IconLayers,
            onSelect: () => setHistory(true),
          },
        ]
      : []),
    ...(canVersion && !uploading
      ? [
          {
            key: "new-version",
            label: t.menu.newVersion,
            icon: IconPaperclip,
            onSelect: () => picker.current?.click(),
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
      {canVersion && (
        <input
          ref={picker}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const [picked] = event.target.files ?? [];
            // Picking the same file again must fire a change.
            event.target.value = "";
            if (picked) addVersion(picked);
          }}
        />
      )}
      {file.versions.length > 1 && (
        <FileVersionsDialog
          file={file}
          open={history}
          onOpenChange={setHistory}
        />
      )}
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
            categories={categories}
            onDone={() => setEditing(false)}
          />
        </FormDialog>
      )}
      {canDelete && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={(open) => !open && closeDelete()}
          title={t.confirmTitle}
          description={
            file.version > 1
              ? t.confirmVersionBody(file.fileName, file.version)
              : t.confirmBody(file.fileName)
          }
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
