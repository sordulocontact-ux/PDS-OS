"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { ChosenFiles } from "@/components/design/references/chosen-files";
import {
  TargetPicker,
  type TargetOption,
} from "@/components/design/references/target-picker";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { addLinkReference } from "@/lib/design/actions/reference-links";
import {
  PROTO_REFERENCE_TYPES,
  PROTO_REFERENCE_USAGES,
  type ProtoReferenceType,
} from "@/lib/design/reference-kinds";
import { REFERENCE_ACCEPT } from "@/lib/design/reference-rules";
import { uploadReferenceFile } from "@/lib/design/upload-reference";
import { conceptionRefs } from "@/lib/i18n/fr/conception-refs";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { conceptionRefs, designSteps };

const t = fr.designSteps.references;

/**
 * « Ajouter une référence » in place (proto refAddForm): a file dropped or
 * chosen, or a link; Titre *, Sorte, Droits d'usage (« À vérifier » by
 * default), Rattacher à (the group it is opened from, checked), Notes. A
 * file already gathered only gains links (one resource, never twice).
 */
export function ReferenceAddForm({
  organizationId,
  projectId,
  options,
  initialTargets,
  onClose,
}: {
  organizationId: string;
  projectId: string;
  options: TargetOption[];
  initialTargets: string[];
  onClose: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [targets, setTargets] = useState(initialTargets);
  const [type, setType] = useState<ProtoReferenceType>("reference");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const url = String(data.get("url") ?? "").trim();
    const note = String(data.get("note") ?? "").trim();
    const usage = String(data.get("usage") ?? "to_check");
    const next: Record<string, string> = {};
    if (!title) next.title = t.form.errors.title;
    if (url && !/^https:\/\/\S+$/.test(url)) next.url = t.form.errors.link;
    if (!url && files.length === 0) next.file = fr.conceptionRefs.add.nothing;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result =
      files.length > 0
        ? await uploadReferenceFile({
            organizationId,
            projectId,
            file: files[0],
            title,
            note,
            targets,
            type,
            usage,
          })
        : await addLinkReference({
            projectId,
            url,
            title,
            note,
            targets,
            type,
            usage: usage as "free" | "internal" | "to_check",
          });
    setBusy(false);
    if (!result.ok) return setErrors({ form: result.error });
    toast.success(targets.length ? t.form.added : t.form.addedLoose);
    onClose();
  }

  return (
    <form
      noValidate
      aria-busy={busy || undefined}
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5 modern:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <FileDropZone
        label={t.form.drop}
        accept={REFERENCE_ACCEPT}
        disabled={busy}
        onFiles={(picked) => setFiles(picked.slice(0, 1))}
      />
      <ChosenFiles
        files={files}
        disabled={busy}
        onRemove={() => setFiles([])}
      />
      <FieldError id="reference-file-error">{errors.file}</FieldError>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="title"
          label={t.form.title}
          required
          maxLength={200}
          error={errors.title}
        />
        <Field
          name="url"
          label={t.form.link}
          inputMode="url"
          placeholder={t.form.linkPlaceholder}
          maxLength={2000}
          error={errors.url}
        />
        <OptionSelect
          name="type"
          label={t.form.kind}
          items={Object.fromEntries(
            PROTO_REFERENCE_TYPES.map((k) => [k, t.kinds[k]]),
          )}
          defaultValue={type}
          onValueChange={(v) => setType(v as ProtoReferenceType)}
        />
        <OptionSelect
          name="usage"
          label={t.form.rights}
          items={Object.fromEntries(
            PROTO_REFERENCE_USAGES.map((k) => [k, t.rights[k]]),
          )}
          defaultValue="to_check"
        />
      </div>
      <TargetPicker
        legend={t.form.targets}
        hint={t.form.noTarget}
        options={options}
        value={targets}
        onChange={setTargets}
        disabled={busy}
      />
      <Field name="note" label={t.form.notes} maxLength={500} />
      <FieldError id="reference-form-error">{errors.form}</FieldError>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
          {t.form.submit}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.form.cancel}
        </Button>
      </div>
    </form>
  );
}
