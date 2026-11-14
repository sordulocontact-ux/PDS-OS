"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ProofPick } from "@/components/distribution/deposit/proof-pick";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { declareDeposit } from "@/lib/distribution/declare-actions";
import { isDeclarationSource } from "@/lib/distribution/tracking";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { useDistributionRelease } from "@/components/distribution/frame/release-scope";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.deposit;
const o = fr.distributionJourney.orchard;
const s = fr.distribution.tracking;

/** The source chosen in the form, or none. */
export const sourceOf = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return isDeclarationSource(text) ? text : "";
};

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
  const releaseId = useDistributionRelease();
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
        releaseId,
        declaredOn: String(form.get("declaredOn") ?? ""),
        orchardId: String(form.get("orchardId") ?? ""),
        source: sourceOf(form.get("source")),
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
      <OptionSelect
        name="source"
        label={s.source}
        items={s.sources}
        // The deposit is made by hand on The Orchard's portal.
        defaultValue="orchard_portal"
      />
      <ProofPick
        label={t.proof}
        drop={t.proofDrop}
        hint={t.proofHint}
        file={file}
        onFile={setFile}
      />
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
