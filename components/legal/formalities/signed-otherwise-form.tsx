"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { todayInParis } from "@/lib/contracts/types";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { noteFormalitySignature } from "@/lib/legal/signed-returns/team-actions";

import { isProofPdf, uploadProof } from "./upload-proof";

const fr = { legalFormalities, signedReturns };

const r = fr.signedReturns.sacem;
const p = fr.legalFormalities.page;

/** « A signé autrement » (JUR-11): the day it was signed and the signed
 * bulletin scanned — the proof; a confirmation in PDS OS is never a
 * signature. */
export function SignedOtherwiseForm({
  projectId,
  formalityId,
  signatureId,
  signer,
  onDone,
}: {
  projectId: string;
  formalityId: string;
  signatureId: string;
  signer: string;
  onDone: () => void;
}) {
  const today = todayInParis(new Date());
  const [on, setOn] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(onDone, r.noted(signer));
  const dayError = tried && (!on || on > today) ? r.signedOnMissing : undefined;
  const fileError = tried && !isProofPdf(file) ? p.proofMissing : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!on || on > today || !isProofPdf(file)) return;
        submit.run(async () => {
          const up = await uploadProof(formalityId, file);
          if (!up.ok) return up;
          return noteFormalitySignature(projectId, signatureId, on, up.path);
        });
      }}
    >
      <Field
        name={`${signatureId}-signed-on`}
        type="date"
        label={r.signedOn}
        hint={r.signedOnHint}
        aria-required
        max={today}
        value={on}
        error={dayError}
        onChange={(event) => setOn(event.target.value)}
        className="h-10 w-fit"
      />
      <FilePickField
        id={`${signatureId}-scan`}
        label={r.scan}
        hint={p.proofHint}
        chosenLabel={p.proofChosen}
        file={file}
        error={fileError}
        onFile={setFile}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={r.note}
        onCancel={onDone}
      />
    </form>
  );
}
