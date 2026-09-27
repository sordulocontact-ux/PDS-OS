"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { FileDetailsFields } from "@/components/catalog/files/file-details-fields";
import { Button } from "@/components/ui/button";
import { updateCatalogFile } from "@/lib/catalog/file-actions";
import type { CatalogFile, FileOwner } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";

// "Modifier" a file: its name, category (moving it to another view) and
// precision. Closes once saved; the list refreshes from the server.
export function FileEditForm({
  owner,
  file,
  onDone,
}: {
  owner: FileOwner;
  file: CatalogFile;
  onDone: () => void;
}) {
  const t = fr.catalogFiles;
  const [fileName, setFileName] = useState(file.fileName);
  const [category, setCategory] = useState(file.category);
  const [description, setDescription] = useState(file.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCatalogFile({
        owner,
        fileId: file.id,
        fileName,
        category,
        description,
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        name="fileName"
        label={t.fields.name}
        autoComplete="off"
        maxLength={255}
        required
        value={fileName}
        disabled={pending}
        onChange={(event) => setFileName(event.target.value)}
      />
      <FileDetailsFields
        kind={owner.kind}
        category={category}
        onCategory={setCategory}
        description={description}
        onDescription={setDescription}
        disabled={pending}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || fileName.trim() === ""}
          aria-busy={pending || undefined}
        >
          {pending ? t.edit.submitting : t.edit.submit}
        </Button>
      </div>
    </form>
  );
}
