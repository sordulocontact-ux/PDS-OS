"use client";

import { Field } from "@/components/auth/field";
import { FinanceFileField } from "@/components/finance/finance-file-field";
import { FormSection } from "@/components/ui/form-section";
import type { FinanceFile } from "@/lib/finance/money-in";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { treasury } from "@/lib/i18n/fr/treasury";

const fr = { clientInvoices, treasury };

type Days = {
  invoiceNumber: string;
  invoicedOn: string;
  dueOn: string;
  sentOn: string;
};

/**
 * The invoice of an income (« Facture » of the income's form): its number,
 * day, due day, sent day and PDF. Empty while nothing is invoiced.
 */
export function InvoiceSection({
  value,
  errors,
  onChange,
  keptFile,
  file,
  onFile,
  onRemoveKept,
}: {
  value: Days;
  errors: Partial<Record<keyof Days, string>>;
  onChange: (patch: Partial<Days>) => void;
  keptFile: FinanceFile | null;
  file: File | null;
  onFile: (file: File) => void;
  onRemoveKept: () => void;
}) {
  const t = fr.treasury.incomeForm;
  const f = fr.clientInvoices.fields;
  return (
    <FormSection title={t.invoiceTitle}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="income-invoice-number"
          label={t.invoiceNumber}
          maxLength={100}
          autoComplete="off"
          value={value.invoiceNumber}
          error={errors.invoiceNumber}
          onChange={(e) => onChange({ invoiceNumber: e.target.value })}
        />
        <Field
          name="income-invoiced-on"
          type="date"
          label={t.invoicedOn}
          value={value.invoicedOn}
          error={errors.invoicedOn}
          onChange={(e) => onChange({ invoicedOn: e.target.value })}
        />
        <Field
          name="income-due-on"
          type="date"
          label={t.dueOn}
          min={value.invoicedOn || undefined}
          value={value.dueOn}
          error={errors.dueOn}
          onChange={(e) => onChange({ dueOn: e.target.value })}
        />
        <Field
          name="income-sent-on"
          type="date"
          label={f.sentOn}
          min={value.invoicedOn || undefined}
          value={value.sentOn}
          error={errors.sentOn}
          onChange={(e) => onChange({ sentOn: e.target.value })}
        />
      </div>
      <FinanceFileField
        id="income-file"
        label={f.file}
        hint={f.fileHint}
        kept={keptFile}
        file={file}
        onFile={onFile}
        onRemoveKept={onRemoveKept}
      />
    </FormSection>
  );
}
