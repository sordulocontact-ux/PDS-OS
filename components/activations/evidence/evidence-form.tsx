"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { uploadActivationFile } from "@/lib/activations/files/upload";
import {
  EVIDENCE_KINDS,
  EVIDENCE_SOURCES,
  type EvidenceKind,
  type EvidenceSource,
} from "@/lib/activations/model";
import { declareEvidence } from "@/lib/activations/proof-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations };

const t = fr.activations.evidence;
const HTTP = /^https?:\/\/\S+$/;

/**
 * « Déclarer une preuve » : its nature, a link, a file (capture, PDF) or at
 * least the declaration's source, the date declared and who says so. Saved
 * as not verified (ticket : « La déclaration produit un événement audité ;
 * elle ne produit pas de vérification automatique »).
 */
export function EvidenceForm({
  scope,
  targetId = null,
  agencyRowId = null,
  defaultKind,
  defaultSource = "internal",
  onDone,
}: {
  scope: ActivationScope;
  targetId?: string | null;
  agencyRowId?: string | null;
  defaultKind: EvidenceKind;
  defaultSource?: EvidenceSource;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ url?: string; something?: string }>(
    {},
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.declared);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const url = String(data.get("url") ?? "").trim();
    const note = String(data.get("note") ?? "").trim();
    const next = {
      url:
        url && !HTTP.test(url) ? fr.activations.errors.urlInvalid : undefined,
      something:
        !url && !file && !note
          ? fr.activations.errors.somethingRequired
          : undefined,
    };
    setErrors(next);
    if (next.url || next.something) return;
    run(async () => {
      let fileId: string | null = null;
      if (file) {
        const uploaded = await uploadActivationFile({
          ...scope,
          kind: "evidence",
          file,
        });
        if (!uploaded.ok) return uploaded;
        fileId = uploaded.fileId;
      }
      return declareEvidence({
        projectId: scope.projectId,
        activationId: scope.activationId,
        targetId,
        agencyRowId,
        kind: String(data.get("kind")) as EvidenceKind,
        platform: String(data.get("platform") ?? ""),
        url,
        fileId,
        declaredOn: String(data.get("declaredOn") ?? ""),
        declaredSource: String(data.get("source")) as EvidenceSource,
        note,
      });
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
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          name="kind"
          label={t.kind}
          required
          items={Object.fromEntries(EVIDENCE_KINDS.map((k) => [k, t.kinds[k]]))}
          defaultValue={defaultKind}
        />
        <OptionSelect
          name="source"
          label={t.source}
          required
          items={Object.fromEntries(
            EVIDENCE_SOURCES.map((s) => [s, t.sources[s]]),
          )}
          defaultValue={defaultSource}
        />
      </div>
      <Field
        name="url"
        type="url"
        label={t.url}
        placeholder="https://"
        maxLength={2000}
        error={errors.url}
      />
      <FilePickField
        id="evidence-file"
        label={t.file}
        hint={fr.activations.fileHint}
        chosenLabel={fr.activations.fileChosen}
        file={file}
        onFile={setFile}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="platform" label={t.platform} maxLength={60} />
        <Field name="declaredOn" type="date" label={t.declaredOn} />
      </div>
      <TextareaField
        name="note"
        label={t.note}
        placeholder={t.notePlaceholder}
        rows={2}
        maxLength={2000}
        error={errors.something}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.declare}
        </Button>
      </div>
    </form>
  );
}
