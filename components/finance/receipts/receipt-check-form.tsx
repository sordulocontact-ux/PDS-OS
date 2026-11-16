"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { centsToInput } from "@/lib/budget/types";
import { checkProof } from "@/lib/finance/proof-gestures";
import type { FinanceProof } from "@/lib/finance/proofs";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { parseEurosToCents } from "@/lib/projects/schemas";

const t = financeReceipts;

/**
 * « Vérifier les valeurs »: what was read on the document, as fields a
 * person corrects then confirms (a photo, a value not found in the PDF's
 * text). Amount TTC and day are required: a match stands on them. Missing
 * fields turn red at the first try only (CLAUDE.md, « Formulaires »).
 */
export function ReceiptCheckForm({
  proof,
  onDone,
}: {
  proof: FinanceProof;
  onDone: () => void;
}) {
  const v0 = proof.values;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, t.check.saved);
  const [tried, setTried] = useState(false);
  const [v, setV] = useState({
    vendor: v0.vendor ?? "",
    amount: v0.amountCents === null ? "" : centsToInput(v0.amountCents),
    vat: v0.vatCents === null ? "" : centsToInput(v0.vatCents),
    issuedOn: v0.issuedOn ?? "",
    reference: v0.reference ?? "",
  });
  const amount = parseEurosToCents(v.amount);
  const errors = {
    amount: !amount ? t.check.amountMissing : undefined,
    issuedOn: !v.issuedOn ? t.check.dateMissing : undefined,
  };
  const missing = Object.values(errors).filter(Boolean).length;
  const shown: Partial<typeof errors> = tried ? errors : {};
  const f = t.sheet.values;

  return (
    <form
      ref={root}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (missing > 0)
          return requestAnimationFrame(() =>
            root.current
              ?.querySelector<HTMLElement>('[aria-invalid="true"]')
              ?.focus(),
          );
        submit.run(() => checkProof({ id: proof.id, ...v }));
      }}
    >
      <Field
        name="amount"
        label={f.amount}
        aria-required
        inputMode="decimal"
        autoComplete="off"
        value={v.amount}
        hint={t.check.amountHint}
        error={shown.amount}
        onChange={(e) => setV({ ...v, amount: e.target.value })}
      />
      <Field
        name="issued-on"
        type="date"
        label={f.issuedOn}
        aria-required
        value={v.issuedOn}
        error={shown.issuedOn}
        onChange={(e) => setV({ ...v, issuedOn: e.target.value })}
      />
      <Field
        name="vendor"
        label={f.vendor}
        maxLength={200}
        value={v.vendor}
        onChange={(e) => setV({ ...v, vendor: e.target.value })}
      />
      <Field
        name="vat"
        label={f.vat}
        inputMode="decimal"
        autoComplete="off"
        value={v.vat}
        onChange={(e) => setV({ ...v, vat: e.target.value })}
      />
      <Field
        name="reference"
        label={f.reference}
        maxLength={120}
        value={v.reference}
        onChange={(e) => setV({ ...v, reference: e.target.value })}
      />
      {tried && missing > 0 && (
        <FormMessage kind="error">{t.check.missingCount(missing)}</FormMessage>
      )}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.check.save}
        pendingLabel={t.check.saving}
        onCancel={onDone}
      />
    </form>
  );
}
