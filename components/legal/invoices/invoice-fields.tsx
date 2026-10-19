"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { feeCentsOf, formatFee } from "@/lib/legal/contracts/fields";

const t = fr.legalInvoices;

/** What an invoice says, typed: its number, its amount excl. tax and,
 * when the amount is not the fee agreed, why. Shared by the person's page
 * and « Ajouter une facture reçue autrement ». */
export type InvoiceInput = { number: string; amount: string; gap: string };

export const amountCentsOf = (amount: string) =>
  feeCentsOf(amount.replace(/\s*HT$/i, ""));

/** The missing or wrong fields of an invoice, by field. */
export function invoiceErrors(
  value: InvoiceInput,
  expectedCents: number,
): Partial<Record<keyof InvoiceInput, string>> {
  const cents = amountCentsOf(value.amount);
  return {
    ...(value.number.trim() ? {} : { number: t.errors.number }),
    ...(cents === null ? { amount: t.errors.amount } : {}),
    ...(cents !== null && cents !== expectedCents && !value.gap.trim()
      ? { gap: t.errors.gap }
      : {}),
  };
}

export function InvoiceFields({
  id,
  value,
  onChange,
  expectedCents,
  errors,
  gapCallout,
}: {
  id: string;
  value: InvoiceInput;
  onChange: (next: InvoiceInput) => void;
  expectedCents: number;
  errors: Partial<Record<keyof InvoiceInput, string>>;
  // The person's page explains the gap before asking why.
  gapCallout?: boolean;
}) {
  const cents = amountCentsOf(value.amount);
  const gap = cents !== null && cents !== expectedCents;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name={`${id}-number`}
          label={t.number}
          required
          value={value.number}
          onChange={(e) => onChange({ ...value, number: e.target.value })}
          error={errors.number}
        />
        <Field
          name={`${id}-amount`}
          label={t.amountField}
          required
          inputMode="decimal"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
          error={errors.amount}
        />
      </div>
      {gap && gapCallout && (
        <ToneCallout tone="warning">
          {t.portal.gapCallout(formatFee(cents), formatFee(expectedCents))}
        </ToneCallout>
      )}
      {gap && (
        <TextareaField
          id={`${id}-gap`}
          name={`${id}-gap`}
          label={t.gapWhy}
          required
          rows={2}
          maxLength={2000}
          placeholder={t.gapWhyPlaceholder}
          value={value.gap}
          onChange={(e) => onChange({ ...value, gap: e.target.value })}
          error={errors.gap}
        />
      )}
    </>
  );
}
