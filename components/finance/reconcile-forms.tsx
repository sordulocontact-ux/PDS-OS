"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { SmallForm, positive } from "@/components/finance/funding-forms";
import { FilePickField } from "@/components/ui/file-pick-field";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { parseBankImport, type BankRow } from "@/lib/finance/bank-import";
import type { BankTransaction, Candidate } from "@/lib/finance/reconcile";
import { txLeft } from "@/lib/finance/reconcile";
import {
  addTransaction,
  importTransactions,
  matchTransaction,
  setTransactionIgnored,
} from "@/lib/finance/reconcile-actions";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { reconcile, treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** « Importer un relevé »: the bank's CSV read and counted first. */
export function BankImportForm({ onDone }: { onDone: () => void }) {
  const t = fr.reconcile.importForm;
  const submit = useWriteSubmit(onDone, "");
  const [file, setFile] = useState<File | null>(null);
  const [read, setRead] = useState<{ rows: BankRow[]; problems: number[] }>({
    rows: [],
    problems: [],
  });
  const [tried, setTried] = useState(false);
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save(read.rows.length)}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (read.rows.length)
          submit.run(() =>
            importTransactions({
              rows: read.rows.map((r) => ({
                bookedOn: r.bookedOn,
                cents: r.cents,
                counterparty: r.counterparty,
                reference: r.reference,
                label: r.label,
                externalId: r.externalId,
              })),
            }),
          );
      }}
    >
      <FilePickField
        id="bank-file"
        label={t.file}
        hint={t.hint}
        accept=".csv,text/csv,text/plain"
        chosenLabel={(name) => name}
        file={file}
        error={tried && read.rows.length === 0 ? t.empty : undefined}
        onFile={(chosen) => {
          setFile(chosen);
          chosen
            .text()
            .then((text) => setRead(parseBankImport(text)))
            .catch(() => setRead({ rows: [], problems: [] }));
        }}
      />
      {read.rows.length > 0 && (
        <FormMessage kind="info">{t.preview(read.rows.length)}</FormMessage>
      )}
      {read.problems.length > 0 && (
        <FormMessage kind="error">
          {t.problems(read.problems.slice(0, 12).join(", "))}
        </FormMessage>
      )}
    </SmallForm>
  );
}

/** « Ajouter une transaction » by hand. */
export function ManualTransactionForm({ onDone }: { onDone: () => void }) {
  const t = fr.reconcile.manualForm;
  const submit = useWriteSubmit(onDone, "");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [value, setValue] = useState("");
  const [bookedOn, setBookedOn] = useState(todayInParis());
  const [counterparty, setCounterparty] = useState("");
  const [reference, setReference] = useState("");
  const [tried, setTried] = useState(false);
  const errors = {
    amount: positive(value) ? undefined : t.errors.amount,
    bookedOn: bookedOn ? undefined : t.errors.bookedOn,
  };
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!errors.amount && !errors.bookedOn)
          submit.run(() =>
            addTransaction({
              bookedOn,
              amount: value,
              direction,
              counterparty,
              reference,
            }),
          );
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="tx-direction">{t.direction}</Label>
          <SearchSelect
            id="tx-direction"
            label={t.direction}
            options={{ out: t.out, in: t.in }}
            value={direction}
            onChange={(v) => setDirection(v === "in" ? "in" : "out")}
            searchPlaceholder={fr.treasury.incomeForm.search}
            emptyLabel={fr.treasury.incomeForm.noMatch}
            fill
          />
        </div>
        <Field
          name="tx-amount"
          label={t.amount}
          suffix="€"
          required
          inputMode="decimal"
          value={value}
          error={tried ? errors.amount : undefined}
          onChange={(e) => setValue(e.target.value)}
        />
        <Field
          name="tx-day"
          type="date"
          label={t.bookedOn}
          required
          value={bookedOn}
          error={tried ? errors.bookedOn : undefined}
          onChange={(e) => setBookedOn(e.target.value)}
        />
        <Field
          name="tx-party"
          label={t.counterparty}
          maxLength={200}
          autoComplete="off"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
      </div>
      <Field
        name="tx-reference"
        label={t.reference}
        maxLength={300}
        autoComplete="off"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
    </SmallForm>
  );
}

/** « Rapprocher… »: any income (credit) or spend (debit) left, and how
 * much of the transaction it takes (partial and multiple allowed). */
export function MatchForm({
  tx,
  candidates,
  preset,
  onDone,
}: {
  tx: BankTransaction;
  candidates: Candidate[];
  preset: Candidate | null;
  onDone: () => void;
}) {
  const t = fr.reconcile.matchForm;
  const submit = useWriteSubmit(onDone, "");
  const kind = tx.cents > 0 ? "income" : "spend";
  const options = candidates.filter((c) => c.kind === kind && c.leftCents > 0);
  const left = txLeft(tx);
  const [targetId, setTargetId] = useState(preset?.id ?? "");
  const target = options.find((c) => c.id === targetId);
  const max = target ? Math.min(left, target.leftCents) : left;
  const [value, setValue] = useState(
    amountInput(preset ? Math.min(left, preset.leftCents) : left),
  );
  const [tried, setTried] = useState(false);
  const cents = parseEurosToCents(value);
  const errors = {
    target: target ? undefined : t.errors.target,
    amount:
      cents && cents > 0 && cents <= max
        ? undefined
        : t.errors.amount(amount(max)),
  };
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!errors.target && !errors.amount && target)
          submit.run(() =>
            matchTransaction({
              transactionId: tx.id,
              kind,
              targetId: target.id,
              amount: value,
            }),
          );
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="match-target" required>
          {t.target}
        </Label>
        <SearchSelect
          id="match-target"
          label={t.target}
          options={{
            "": t.targetPlaceholder,
            ...Object.fromEntries(
              options.map((c) => [
                c.id,
                fr.reconcile.suggestion(
                  c.label,
                  fr.reconcile.left(amount(c.leftCents)),
                ),
              ]),
            ),
          }}
          value={targetId}
          onChange={(id) => {
            setTargetId(id);
            const chosen = options.find((c) => c.id === id);
            if (chosen) setValue(amountInput(Math.min(left, chosen.leftCents)));
          }}
          searchPlaceholder={fr.treasury.incomeForm.search}
          emptyLabel={fr.treasury.incomeForm.noMatch}
          fill
        />
        {tried && errors.target && (
          <p className="text-caption text-[color:var(--error)]">
            {errors.target}
          </p>
        )}
      </div>
      <Field
        name="match-amount"
        label={t.amount}
        suffix="€"
        required
        inputMode="decimal"
        hint={t.amountHint(amount(max))}
        value={value}
        error={tried ? errors.amount : undefined}
        onChange={(e) => setValue(e.target.value)}
      />
    </SmallForm>
  );
}

/** « Ignorer », with its reason. */
export function IgnoreForm({
  tx,
  onDone,
}: {
  tx: BankTransaction;
  onDone: () => void;
}) {
  const t = fr.reconcile.ignoreForm;
  const submit = useWriteSubmit(onDone, "");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (reason.trim())
          submit.run(() => setTransactionIgnored({ id: tx.id, reason }));
      }}
    >
      <TextareaField
        name="ignore-reason"
        label={t.reason}
        required
        maxLength={300}
        rows={2}
        value={reason}
        error={tried && !reason.trim() ? t.error : undefined}
        onChange={(e) => setReason(e.target.value)}
      />
    </SmallForm>
  );
}
