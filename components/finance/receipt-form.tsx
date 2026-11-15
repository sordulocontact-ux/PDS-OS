"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { remainingCents, type Income } from "@/lib/finance/money-in";
import {
  addReceipt,
  cancelIncome,
  removeReceipt,
} from "@/lib/finance/treasury-actions";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { formatShortDay } from "@/lib/utils/day";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * « Enregistrer un encaissement »: money received for an income, the rest
 * by default (a partial receipt is typed over it). What it already received
 * is listed first, each receipt removable when it was a mistake.
 */
export function ReceiptForm({
  income,
  onDone,
}: {
  income: Income;
  onDone: () => void;
}) {
  const t = fr.treasury.receiptForm;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, "");
  const rest = remainingCents(income);
  const [value, setValue] = useState(rest > 0 ? amountInput(rest) : "");
  const [receivedOn, setReceivedOn] = useState(todayInParis());
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const cents = parseEurosToCents(value);
  const errors = {
    amount:
      cents === null || cents === undefined || cents <= 0
        ? t.errors.amount
        : cents > rest
          ? t.errors.over(amount(rest))
          : undefined,
    receivedOn: receivedOn ? undefined : t.errors.receivedOn,
  };
  const missing = Object.values(errors).filter(Boolean).length;

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
    submit.run(() =>
      addReceipt({ incomeId: income.id, amount: value, receivedOn, note }),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {income.receipts.length > 0 && (
        <section
          aria-labelledby="receipts-earlier"
          className="flex flex-col gap-2"
        >
          <h3
            id="receipts-earlier"
            className="text-caption text-[color:var(--text-secondary)]"
          >
            {t.earlier}
          </h3>
          <ul className="flex flex-col gap-2">
            {income.receipts.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 text-body-md"
              >
                <span className="tabular-nums">
                  {amount(r.cents)} ·{" "}
                  {formatShortDay(r.receivedOn, { bare: true })}
                </span>
                <ConfirmButton
                  label={t.removeConfirm}
                  size="xs"
                  title={t.removeTitle}
                  body={t.remove(
                    amount(r.cents),
                    formatShortDay(r.receivedOn, { bare: true }),
                  )}
                  confirmLabel={t.removeConfirm}
                  pendingLabel={t.removing}
                  done={t.removed}
                  run={() => removeReceipt(r.id)}
                />
              </li>
            ))}
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
              name="receipt-amount"
              label={t.amount}
              suffix="€"
              required
              inputMode="decimal"
              autoComplete="off"
              hint={t.remaining(amount(rest))}
              value={value}
              error={tried ? errors.amount : undefined}
              onChange={(e) => setValue(e.target.value)}
            />
            <Field
              name="receipt-received-on"
              type="date"
              label={t.receivedOn}
              required
              value={receivedOn}
              error={tried ? errors.receivedOn : undefined}
              onChange={(e) => setReceivedOn(e.target.value)}
            />
          </div>
          <Field
            name="receipt-note"
            label={t.note}
            maxLength={500}
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
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

/** « Annuler l'entrée », with its reason: out of the forecast, kept in the
 * history. Refused by SQL once money came in. */
export function CancelIncomeForm({
  income,
  onDone,
}: {
  income: Income;
  onDone: () => void;
}) {
  const t = fr.treasury.cancelForm;
  const submit = useWriteSubmit(onDone, "");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const error = tried && !reason.trim() ? t.reasonMissing : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (reason.trim())
          submit.run(() => cancelIncome({ incomeId: income.id, reason }));
      }}
      className="flex flex-col gap-5"
    >
      <TextareaField
        name="cancel-reason"
        label={t.reason}
        required
        maxLength={1000}
        rows={3}
        value={reason}
        error={error}
        onChange={(e) => setReason(e.target.value)}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.confirm}
        pendingLabel={t.pending}
        onCancel={onDone}
      />
    </form>
  );
}
