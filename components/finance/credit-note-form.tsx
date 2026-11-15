"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { FinanceFileField } from "@/components/finance/finance-file-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { addCreditNote } from "@/lib/finance/invoice-actions";
import { remainingCents, type Income } from "@/lib/finance/money-in";
import { uploadFinanceFile } from "@/lib/finance/upload-file";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { formatShortDay } from "@/lib/utils/day";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { clientInvoices, treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * « Émettre un avoir »: corrects the invoice for a part not received, at
 * most what it still awaits (the whole rest by default: an invoice
 * cancelled after it was sent). The credit notes issued before are listed
 * first; a credit note is never changed.
 */
export function CreditNoteForm({
  income,
  organizationId,
  onDone,
}: {
  income: Income;
  organizationId: string;
  onDone: () => void;
}) {
  const t = fr.clientInvoices.creditForm;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, "");
  const rest = remainingCents(income);
  const [number, setNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState(todayInParis());
  const [value, setValue] = useState(rest > 0 ? amountInput(rest) : "");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const cents = parseEurosToCents(value);
  const errors = {
    number: number.trim() ? undefined : t.errors.number,
    issuedOn: !issuedOn
      ? t.errors.issuedOn
      : income.invoicedOn && issuedOn < income.invoicedOn
        ? t.errors.beforeInvoice
        : undefined,
    amount:
      cents === null || cents === undefined || cents <= 0
        ? t.errors.amount
        : cents > rest
          ? t.errors.over(amount(rest))
          : undefined,
    reason: reason.trim() ? undefined : t.errors.reason,
  };
  const missing = Object.values(errors).filter(Boolean).length;
  const shown = (key: keyof typeof errors) => (tried ? errors[key] : undefined);

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (missing > 0) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    submit.run(async () => {
      const stored = file
        ? await uploadFinanceFile(organizationId, file)
        : null;
      if (stored && !stored.ok) return stored;
      return addCreditNote({
        incomeId: income.id,
        number,
        issuedOn,
        amount: value,
        reason,
        file: stored ? { path: stored.path, name: stored.name } : null,
      });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {income.credits.length > 0 && (
        <section
          aria-labelledby="credits-earlier"
          className="flex flex-col gap-2"
        >
          <h3
            id="credits-earlier"
            className="text-caption text-[color:var(--text-secondary)]"
          >
            {t.earlier}
          </h3>
          <ul className="flex flex-col gap-1 text-body-md">
            {income.credits.map((c) => {
              const line = t.line(
                c.number,
                amount(c.cents),
                formatShortDay(c.issuedOn, { bare: true }),
              );
              return (
                <li key={c.id} className="tabular-nums">
                  {c.file?.url ? (
                    <a
                      href={c.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      {line}
                    </a>
                  ) : (
                    line
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {rest > 0 && (
        <form
          ref={root}
          noValidate
          onSubmit={send}
          className="flex flex-col gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              name="credit-number"
              label={t.number}
              required
              maxLength={100}
              autoComplete="off"
              value={number}
              error={shown("number")}
              onChange={(e) => setNumber(e.target.value)}
            />
            <Field
              name="credit-issued-on"
              type="date"
              label={t.issuedOn}
              required
              min={income.invoicedOn ?? undefined}
              value={issuedOn}
              error={shown("issuedOn")}
              onChange={(e) => setIssuedOn(e.target.value)}
            />
          </div>
          <Field
            name="credit-amount"
            label={t.amount}
            suffix="€"
            required
            inputMode="decimal"
            autoComplete="off"
            hint={t.remaining(amount(rest))}
            value={value}
            error={shown("amount")}
            onChange={(e) => setValue(e.target.value)}
          />
          <TextareaField
            name="credit-reason"
            label={t.reason}
            required
            maxLength={1000}
            rows={2}
            value={reason}
            error={shown("reason")}
            onChange={(e) => setReason(e.target.value)}
          />
          <FinanceFileField
            id="credit-file"
            label={t.file}
            hint={t.fileHint}
            kept={null}
            file={file}
            onFile={setFile}
          />
          {tried && missing > 0 && (
            <FormMessage kind="error">
              {fr.treasury.incomeForm.errors.missing(missing)}
            </FormMessage>
          )}
          {submit.error && (
            <FormMessage kind="error">{submit.error}</FormMessage>
          )}
          <DialogFormActions
            pending={submit.pending}
            submitLabel={t.save}
            pendingLabel={t.saving}
            onCancel={onDone}
          />
        </form>
      )}
    </div>
  );
}
