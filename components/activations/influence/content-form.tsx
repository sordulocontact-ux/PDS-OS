"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { uploadActivationFile } from "@/lib/activations/files/upload";
import { submitContent } from "@/lib/activations/influence/content-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence.contents;

/** « Déposer une version » : a free label, a file or a link, a note. */
export function ContentForm({
  scope,
  targetId,
  nextLabel,
  onDone,
}: {
  scope: ActivationScope;
  targetId: string;
  nextLabel: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mediaMissing, setMediaMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.submitted);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const url = String(data.get("url") ?? "").trim();
        setMediaMissing(!url && !file);
        if (!url && !file) return;
        run(async () => {
          let fileId: string | null = null;
          if (file) {
            const uploaded = await uploadActivationFile({
              ...scope,
              kind: "content",
              file,
            });
            if (!uploaded.ok) return uploaded;
            fileId = uploaded.fileId;
          }
          return submitContent({
            projectId: scope.projectId,
            activationId: scope.activationId,
            targetId,
            label: String(data.get("label") ?? ""),
            url,
            fileId,
            note: String(data.get("note") ?? ""),
          });
        });
      }}
    >
      <Field
        name="label"
        label={t.label}
        required
        maxLength={80}
        defaultValue={nextLabel}
        placeholder={t.labelPlaceholder}
      />
      <Field
        name="url"
        type="url"
        label={t.url}
        placeholder="https://"
        maxLength={2000}
      />
      <FilePickField
        id="content-file"
        label={t.file}
        hint={fr.activations.fileHint}
        chosenLabel={fr.activations.fileChosen}
        file={file}
        onFile={setFile}
      />
      <Field name="note" label={t.note} maxLength={2000} />
      {mediaMissing && (
        <FormMessage kind="error">
          {fr.activationInfluence.errors.mediaRequired}
        </FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
