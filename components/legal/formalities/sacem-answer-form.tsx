"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { SACEM_725_FIELDS } from "@/lib/legal/formalities/definition";
import {
  completeFormality,
  formalityStep,
  requireFormalityAction,
} from "@/lib/legal/formalities/step-actions";

import { isProofPdf, uploadProof } from "./upload-proof";

const t = fr.legalFormalities.page;
type Outcome = "registered" | "fix" | "rejected";

/** « Enregistrer la réponse de la SACEM » (JUR-03): registered — never
 * without its proof (a PDF) and the work's SACEM identifier —, to correct
 * (the field it reopens, what it asks) or rejected (why). */
export function SacemAnswerForm({
  projectId,
  formalityId,
  onDone,
}: {
  projectId: string;
  formalityId: string;
  onDone: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("registered");
  const [file, setFile] = useState<File | null>(null);
  const [externalId, setExternalId] = useState("");
  const [iswc, setIswc] = useState("");
  const [field, setField] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const tr = fr.legalFormalities.transitions;
  const submit = useWriteSubmit(onDone, tr.complete);
  const errors = tried
    ? {
        file:
          outcome === "registered" && !isProofPdf(file) ? t.proofMissing : null,
        externalId:
          outcome === "registered" && !externalId.trim()
            ? t.externalIdMissing
            : undefined,
        field:
          outcome === "fix" && !field
            ? fr.legalFormalities.errors.reason
            : undefined,
        note:
          outcome !== "registered" && !note.trim()
            ? fr.legalFormalities.errors.reason
            : undefined,
      }
    : null;

  function send() {
    setTried(true);
    if (outcome === "registered") {
      if (!isProofPdf(file) || !externalId.trim()) return;
      return submit.run(async () => {
        const up = await uploadProof(formalityId, file);
        if (!up.ok) return up;
        return completeFormality(
          projectId,
          formalityId,
          note,
          externalId,
          iswc,
          up.path,
        );
      });
    }
    if (!note.trim() || (outcome === "fix" && !field)) return;
    submit.run(
      () =>
        outcome === "fix"
          ? requireFormalityAction(projectId, formalityId, [field], note)
          : formalityStep(projectId, formalityId, "reject", note),
      outcome === "fix" ? tr.correction : tr.reject,
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <p className="text-sm text-muted-foreground">{t.answerBody}</p>
      <ChoiceCards<Outcome>
        name={`${formalityId}-outcome`}
        legend={t.outcome}
        required
        choices={(["registered", "fix", "rejected"] as const).map((v) => ({
          value: v,
          label: t.outcomes[v],
        }))}
        value={outcome}
        onChange={(v) => {
          setOutcome(v);
          setTried(false);
        }}
      />
      {outcome === "registered" && (
        <>
          <FilePickField
            id={`${formalityId}-registered`}
            label={t.completeFile}
            hint={t.proofHint}
            chosenLabel={t.proofChosen}
            file={file}
            error={errors?.file}
            onFile={setFile}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name={`${formalityId}-external`}
              label={t.externalId}
              aria-required
              value={externalId}
              error={errors?.externalId}
              onChange={(e) => setExternalId(e.target.value)}
            />
            <Field
              name={`${formalityId}-iswc`}
              label={t.iswc}
              placeholder="T-000.000.000-0"
              value={iswc}
              onChange={(e) => setIswc(e.target.value)}
            />
          </div>
        </>
      )}
      {outcome === "fix" && (
        <OptionSelect
          name={`${formalityId}-correction-field`}
          label={t.correctionFields}
          required
          error={errors?.field}
          items={Object.fromEntries(
            SACEM_725_FIELDS.map((x) => [
              x.key,
              fr.legalFormalities.fields[x.key],
            ]),
          )}
          onValueChange={setField}
        />
      )}
      <TextareaField
        name={`${formalityId}-answer-note`}
        label={
          outcome === "registered"
            ? t.submitProof
            : outcome === "fix"
              ? t.correctionNote
              : t.rejectReason
        }
        aria-required={outcome !== "registered" || undefined}
        rows={2}
        maxLength={2000}
        value={note}
        error={errors?.note}
        onChange={(e) => setNote(e.target.value)}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.confirm}
        onCancel={onDone}
      />
    </form>
  );
}
