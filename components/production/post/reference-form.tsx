"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { uploadProductionFile } from "@/lib/production/files/upload";
import { addPostReference } from "@/lib/production/post/reference-actions";
import {
  REFERENCE_KINDS,
  type ReferenceKind,
} from "@/lib/production/post/rules";
import type { PostScope } from "@/lib/production/post/types";

import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";

const fr = { productionPost };

const t = fr.productionPost.references;
const HTTPS = /^https:\/\/\S+$/;

/** « Ajouter une référence »: a link, a file or a note of the edit. */
export function ReferenceForm({
  scope,
  onDone,
}: {
  scope: PostScope;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<ReferenceKind>("link");
  const [file, setFile] = useState<File | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const title = String(data.get("title") ?? "");
    const note = String(data.get("note") ?? "");
    const url = String(data.get("url") ?? "").trim();
    const lack =
      kind === "link" && !HTTPS.test(url)
        ? t.missing.url
        : kind === "file" && !file
          ? t.missing.file
          : kind === "note" && note.trim() === ""
            ? t.missing.note
            : null;
    setMissing(lack);
    if (lack) {
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const base = { projectId: scope.projectId, sheetId: scope.sheetId, title };
    run(async () => {
      if (kind === "link")
        return addPostReference({ ...base, kind, url, note });
      if (kind === "note") return addPostReference({ ...base, kind, note });
      if (!file) return { ok: false, error: t.missing.file };
      const uploaded = await uploadProductionFile({
        ...scope,
        kind: "reference",
        note: "",
        file,
      });
      if (!uploaded.ok) return uploaded;
      return addPostReference({ ...base, kind, fileId: uploaded.fileId, note });
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <ChoiceCards
        name="kind"
        legend={t.kindLegend}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setMissing(null);
        }}
        columns={3}
        choices={REFERENCE_KINDS.map((k) => ({
          value: k,
          label: t.kinds[k].label,
          hint: t.kinds[k].hint,
        }))}
      />
      {kind !== "note" && (
        <Field name="title" label={t.titleLabel} maxLength={200} />
      )}
      {kind === "link" && (
        <Field
          name="url"
          type="url"
          label={t.url}
          hint={t.urlHint}
          aria-required
          error={missing ?? undefined}
          maxLength={2000}
        />
      )}
      {kind === "file" && (
        <FilePickField
          id="reference-file"
          label={t.file}
          hint={t.fileHint}
          chosenLabel={t.fileChosen}
          file={file}
          error={missing}
          onFile={(next) => {
            setFile(next);
            setMissing(null);
          }}
        />
      )}
      <TextareaField
        name="note"
        label={kind === "note" ? t.noteRequired : t.note}
        rows={3}
        maxLength={2000}
        aria-required={kind === "note" || undefined}
        error={kind === "note" ? (missing ?? undefined) : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
