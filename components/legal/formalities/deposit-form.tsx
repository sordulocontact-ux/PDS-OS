"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { formalityStep } from "@/lib/legal/formalities/step-actions";

import { isProofPdf, uploadProof } from "./upload-proof";

const t = fr.legalFormalities.page;

/** « Enregistrer le dépôt » (JUR-03): the deposit receipt, a PDF, and a
 * note. Déposé n'est pas enregistré: the SACEM answers later. */
export function DepositForm({
  projectId,
  formalityId,
  onDone,
}: {
  projectId: string;
  formalityId: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(onDone, fr.legalFormalities.transitions.submit);
  const fileError = tried && !isProofPdf(file) ? t.proofMissing : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!isProofPdf(file)) return;
        submit.run(async () => {
          const up = await uploadProof(formalityId, file);
          if (!up.ok) return up;
          return formalityStep(projectId, formalityId, "submit", note, up.path);
        });
      }}
    >
      <FilePickField
        id={`${formalityId}-deposit`}
        label={t.submitFile}
        hint={t.proofHint}
        chosenLabel={t.proofChosen}
        file={file}
        error={fileError}
        onFile={setFile}
      />
      <TextareaField
        name={`${formalityId}-deposit-note`}
        label={t.submitProof}
        rows={2}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
