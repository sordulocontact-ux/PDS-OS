"use client";

import { Field } from "@/components/auth/field";
import { fr } from "@/lib/i18n/fr";

import type { InvoiceDraft, InvoiceErrors } from "./invoice-check";

const t = fr.masterInvoice.fields;
const h3 =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/** The RIB of an invoice (proto): IBAN, BIC, holder, and what becomes of
 * it (kept in the card, or checked by phone before any payment). */
export function InvoiceRibFields({
  title,
  note,
  draft,
  errors,
  onChange,
}: {
  title: string;
  note: string;
  draft: InvoiceDraft;
  errors: InvoiceErrors;
  onChange: (patch: Partial<InvoiceDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={h3}>{title}</h3>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field
          name="iban"
          label={t.iban}
          aria-required
          autoComplete="off"
          placeholder={t.ibanPlaceholder}
          value={draft.iban}
          error={errors.iban}
          onChange={(e) => onChange({ iban: e.target.value })}
        />
        <Field
          name="bic"
          label={t.bic}
          autoComplete="off"
          placeholder={t.bicPlaceholder}
          value={draft.bic}
          error={errors.bic}
          onChange={(e) => onChange({ bic: e.target.value })}
        />
      </div>
      <Field
        name="holder"
        label={t.holder}
        aria-required
        value={draft.holder}
        error={errors.holder}
        onChange={(e) => onChange({ holder: e.target.value })}
      />
      <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
        {note}
      </p>
    </div>
  );
}
