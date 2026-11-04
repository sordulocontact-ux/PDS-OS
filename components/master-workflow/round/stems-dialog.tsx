"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useId, useState } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { PendingFiles } from "@/components/catalog/files/pending-files";
import { useCatalogUpload } from "@/components/catalog/files/use-catalog-upload";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  MAX_DESCRIPTION_LENGTH,
  fileExtension,
} from "@/lib/catalog/file-rules";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterRound } from "@/lib/i18n/fr/master-round";

const fr = { catalogFiles, dialogs, masterRound };

const t = fr.masterRound.before.stemsDialog;

// What the engineer's deposit already takes as stems.
const STEMS_EXTENSIONS = ["zip", "wav", "aif", "aiff", "flac"];
const STEMS_ACCEPT = STEMS_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/**
 * « Ajouter les pistes séparées » of a title, from the Mixage's « Avant
 * d'envoyer »: what stems are and who makes them, a zone to drop or pick
 * them, a precision; « Ajouter » files them as the title's working files
 * in the Catalogue (category `stems`), one after the other.
 */
export function StemsDialog({
  open,
  onOpenChange,
  organizationId,
  masterId,
  title,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  masterId: string;
  title: string;
  onAdded: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(title)}
      description={t.description}
      closeLabel={fr.dialogs.close}
    >
      {open && (
        <StemsForm
          organizationId={organizationId}
          masterId={masterId}
          onCancel={() => onOpenChange(false)}
          onAdded={onAdded}
        />
      )}
    </FormDialog>
  );
}

function StemsForm({
  organizationId,
  masterId,
  onCancel,
  onAdded,
}: {
  organizationId: string;
  masterId: string;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const errorId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [filesError, setFilesError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { run, pending, done } = useCatalogUpload();

  function choose(picked: File[]) {
    // Dropped files are not filtered by the picker's `accept`.
    const wrong = picked.filter(
      (file) => !STEMS_EXTENSIONS.includes(fileExtension(file.name) ?? ""),
    );
    setFiles(picked.filter((file) => !wrong.includes(file)));
    setFilesError(
      wrong.length
        ? t.wrongFormat(wrong.map((f) => f.name).join(", "))
        : undefined,
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setFilesError(filesError ?? t.noFile);
      return;
    }
    setError(null);
    run(
      files,
      (file) => ({
        organizationId,
        owner: { kind: "master", id: masterId },
        category: "stems",
        description: description.trim() || null,
        file,
      }),
      (failed, lastError) => {
        if (failed.length === 0) {
          onAdded();
          return;
        }
        setError(
          files.length === 1
            ? lastError
            : fr.catalogFiles.add.partial(failed.length),
        );
        setFiles(failed);
      },
    );
  }

  const progress =
    files.length > 1
      ? fr.catalogFiles.add.uploadingMany(
          Math.min(done + 1, files.length),
          files.length,
        )
      : fr.catalogFiles.add.uploading;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FileDropZone
          label={t.drop}
          hint={t.formats}
          accept={STEMS_ACCEPT}
          multiple
          icon={IconFile}
          disabled={pending}
          describedBy={filesError ? errorId : undefined}
          onFiles={choose}
        />
        <FieldError id={errorId}>{filesError}</FieldError>
      </div>
      {files.length > 0 && <PendingFiles files={files} />}
      <Field
        name="description"
        label={t.precision}
        autoComplete="off"
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={t.placeholder}
        value={description}
        disabled={pending}
        onChange={(event) => setDescription(event.target.value)}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={fr.catalogFiles.add.submit}
        pendingLabel={progress}
        onCancel={onCancel}
      />
    </form>
  );
}
