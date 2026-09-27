"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { FileDetailsFields } from "@/components/catalog/files/file-details-fields";
import { FileTypeIcon } from "@/components/catalog/files/file-type-icon";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  fileFormat,
  formatFileSize,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

// Files just dropped or picked: where to classify them, then Ajouter. They
// share the category and the precision; once recorded, the page refreshes
// from the server and they appear in Tous and in their category.
export function AddFilesDialog({
  organizationId,
  owner,
  files,
  suggested,
  onClose,
  onAdded,
}: {
  organizationId: string;
  owner: FileOwner;
  // null: closed.
  files: File[] | null;
  suggested: string | null;
  onClose: () => void;
  onAdded: (category: string) => void;
}) {
  const t = fr.catalogFiles;
  const count = files?.length ?? 0;
  return (
    <FormDialog
      open={files !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t.add.title(count)}
      description={count > 1 ? t.add.descriptionMany : t.add.description}
      closeLabel={t.close}
    >
      {files && (
        <AddFilesForm
          organizationId={organizationId}
          owner={owner}
          files={files}
          suggested={suggested}
          onCancel={onClose}
          onAdded={onAdded}
        />
      )}
    </FormDialog>
  );
}

function AddFilesForm({
  organizationId,
  owner,
  files,
  suggested,
  onCancel,
  onAdded,
}: {
  organizationId: string;
  owner: FileOwner;
  files: File[];
  suggested: string | null;
  onCancel: () => void;
  onAdded: (category: string) => void;
}) {
  const t = fr.catalogFiles;
  // Files still to send: after a partial failure, only the failed ones.
  const [remaining, setRemaining] = useState(files);
  const [category, setCategory] = useState<string | null>(suggested);
  const [description, setDescription] = useState("");
  const [categoryError, setCategoryError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) {
      setCategoryError(t.fields.categoryRequired);
      return;
    }
    setError(null);
    startTransition(async () => {
      const failed: File[] = [];
      let lastError: string | null = null;
      setDone(0);
      // One after the other: each upload is its own request, and the
      // progress reads "Envoi 2/3…".
      for (const file of remaining) {
        const result = await uploadCatalogFile({
          organizationId,
          owner,
          category,
          description,
          file,
        });
        if (!result.ok) {
          failed.push(file);
          lastError = result.error;
        }
        setDone((value) => value + 1);
      }
      if (failed.length === 0) {
        onAdded(category);
        return;
      }
      setRemaining(failed);
      setError(
        remaining.length === 1 ? lastError : t.add.partial(failed.length),
      );
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2">
        {remaining.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex min-w-0 items-center gap-3"
          >
            <FileTypeIcon file={{ fileName: file.name, mime: file.type }} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {[fileFormat(file.name, file.type), formatFileSize(file.size)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <FileDetailsFields
        kind={owner.kind}
        category={category}
        onCategory={(value) => {
          setCategory(value);
          setCategoryError(undefined);
        }}
        description={description}
        onDescription={setDescription}
        categoryError={categoryError}
        disabled={pending}
      />
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending
            ? remaining.length > 1
              ? t.add.uploadingMany(
                  Math.min(done + 1, remaining.length),
                  remaining.length,
                )
              : t.add.uploading
            : t.add.submit}
        </Button>
      </div>
    </form>
  );
}
