"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveReserve, saveStatement } from "@/lib/finance/treasury-actions";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput } from "@/lib/utils/money";

const fr = { treasury };

const isAmount = (value: string) => {
  const parsed = parseEurosToCents(value.trim().replace(/^-/, ""));
  return parsed !== null && parsed !== undefined;
};

/** « Mettre à jour le solde »: the balance the bank shows, on a day (today
 * by default). The treasury starts from the latest one. */
function StatementForm({ onDone }: { onDone: () => void }) {
  const t = fr.treasury.statementForm;
  const root = useRef<HTMLFormElement>(null);
  const submit = useWriteSubmit(onDone, "");
  const today = todayInParis();
  const [amount, setAmount] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const errors = {
    amount: isAmount(amount) ? undefined : t.errors.amount,
    asOf: !asOf ? t.errors.asOf : asOf > today ? t.errors.future : undefined,
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
    submit.run(() => saveStatement({ amount, asOf, note }));
  }

  return (
    <form ref={root} noValidate onSubmit={send} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="statement-amount"
          label={t.amount}
          suffix="€"
          required
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          error={tried ? errors.amount : undefined}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field
          name="statement-as-of"
          type="date"
          label={t.asOf}
          required
          max={today}
          value={asOf}
          error={tried ? errors.asOf : undefined}
          onChange={(e) => setAsOf(e.target.value)}
        />
      </div>
      <Field
        name="statement-note"
        label={t.note}
        maxLength={500}
        autoComplete="off"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}

/** The minimum reserve: under it, the treasury warns. */
function ReserveForm({
  reserveCents,
  onDone,
}: {
  reserveCents: number;
  onDone: () => void;
}) {
  const t = fr.treasury.reserveForm;
  const submit = useWriteSubmit(onDone, "");
  const [amount, setAmount] = useState(
    reserveCents > 0 ? amountInput(reserveCents) : "",
  );
  const [tried, setTried] = useState(false);
  const invalid = amount.trim() !== "" && !isAmount(amount);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!invalid) submit.run(() => saveReserve({ amount }));
      }}
      className="flex flex-col gap-5"
    >
      <Field
        name="reserve-amount"
        label={t.amount}
        suffix="€"
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        error={tried && invalid ? t.error : undefined}
        onChange={(e) => setAmount(e.target.value)}
      />
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onCancel={onDone}
      />
    </form>
  );
}

export function StatementButton({
  first = false,
  variant = "outline",
}: {
  // No statement yet: « Saisir le solde ».
  first?: boolean;
  variant?: "default" | "outline";
}) {
  const t = fr.treasury;
  return (
    <DialogButton
      label={first ? t.page.enterBalance : t.page.updateBalance}
      variant={variant}
      size="default"
      title={t.statementForm.title}
      description={t.statementForm.description}
    >
      {(close) => <StatementForm onDone={close} />}
    </DialogButton>
  );
}

export function ReserveButton({ reserveCents }: { reserveCents: number }) {
  const t = fr.treasury;
  return (
    <DialogButton
      label={t.page.reserve}
      size="default"
      title={t.reserveForm.title}
      description={t.reserveForm.description}
    >
      {(close) => <ReserveForm reserveCents={reserveCents} onDone={close} />}
    </DialogButton>
  );
}
