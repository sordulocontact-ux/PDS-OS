"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ProofChip } from "@/components/distribution/deposit/proof-chip";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { declareDeposit } from "@/lib/distribution/declare-actions";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.deposit;
const o = fr.distributionJourney.orchard;

/**
 * « Dépôt manuel effectué dans The Orchard » (proto `UI.declare`): the date,
 * The Orchard's identifier and a proof, all three optional and their
 * absence kept visible, then « Déclarer le dépôt ». The proof goes to the
 * private bucket first, and is removed if the declaration is refused.
 */
export function DepositForm({
  projectId,
  organizationId,
  today,
}: {
  projectId: string;
  organizationId: string;
  today: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(
    () => setFile(null),
    o.depositDeclared,
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFailed(null);
    run(async () => {
      let proof = { path: "", name: "" };
      if (file) {
        const up = await uploadProof({ organizationId, projectId, file });
        if ("error" in up) return { ok: false, error: up.error };
        proof = up;
      }
      const result = await declareDeposit({
        projectId,
        declaredOn: String(form.get("declaredOn") ?? ""),
        orchardId: String(form.get("orchardId") ?? ""),
        proofPath: proof.path,
        proofName: proof.name,
      });
      if (!result.ok && proof.path) await removeProof(proof.path);
      return result;
    });
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.title}
      </h3>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.body}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="declaredOn"
          type="date"
          label={t.date}
          defaultValue={today}
          max={today}
        />
        <Field
          name="orchardId"
          label={t.orchardId}
          placeholder={t.orchardIdPlaceholder}
          maxLength={100}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[length:var(--type-body-sm)] font-medium">
          {t.proof}
        </span>
        {file ? (
          <span>
            <ProofChip name={file.name} onRemove={() => setFile(null)} />
          </span>
        ) : (
          <FileDropZone
            label={t.proofDrop}
            hint={t.proofHint}
            icon={IconPaperclip}
            onFiles={(files) => setFile(files[0] ?? null)}
          />
        )}
      </div>
      <FormMessage kind="error">{failed ?? error}</FormMessage>
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.declare}
        </Button>
      </div>
    </form>
  );
}
