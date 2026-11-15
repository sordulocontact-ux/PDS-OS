"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { SmallForm, positive, whole } from "@/components/finance/funding-forms";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { CreditLine, Show, ShowFormat } from "@/lib/finance/engines";
import { addCreditDraw, saveShow } from "@/lib/finance/funding-actions";
import { spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import { fundings } from "@/lib/i18n/fr/fundings";
import { treasury } from "@/lib/i18n/fr/treasury";
import { todayInParis } from "@/lib/insights/dates";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { fundings, treasury };

function Select({
  id,
  label,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} required>
        {label}
      </Label>
      <SearchSelect
        id={id}
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        searchPlaceholder={fr.treasury.incomeForm.search}
        emptyLabel={fr.treasury.incomeForm.noMatch}
        fill
      />
      {error && (
        <p className="text-caption text-[color:var(--error)]">{error}</p>
      )}
    </div>
  );
}

/** « Planifier une émission », or move one: its format, name and day. */
export function ShowForm({
  show,
  formats,
  initialFormatId,
  onDone,
}: {
  show: Show | null;
  formats: ShowFormat[];
  // A format's card plans a show of that format.
  initialFormatId?: string;
  onDone: () => void;
}) {
  const t = fr.fundings.shows.form;
  const submit = useWriteSubmit(onDone, "");
  const live = formats.filter((f) => !f.archived || f.id === show?.formatId);
  const [formatId, setFormatId] = useState(
    show?.formatId ?? initialFormatId ?? live[0]?.id ?? "",
  );
  const [label, setLabel] = useState(show?.label ?? "");
  const [day, setDay] = useState(show?.plannedOn ?? "");
  const [tried, setTried] = useState(false);
  const errors = {
    format: formatId ? undefined : t.errors.format,
    label: label.trim() ? undefined : t.errors.label,
    day: day ? undefined : t.errors.day,
  };
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!Object.values(errors).some(Boolean))
          submit.run(() =>
            saveShow({ id: show?.id, formatId, label, plannedOn: day }),
          );
      }}
    >
      <Select
        id="show-format"
        label={t.format}
        options={Object.fromEntries(live.map((f) => [f.id, f.name]))}
        value={formatId}
        onChange={setFormatId}
        error={tried ? errors.format : undefined}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="show-label"
          label={t.label}
          required
          maxLength={120}
          autoComplete="off"
          value={label}
          error={tried ? errors.label : undefined}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Field
          name="show-day"
          type="date"
          label={t.day}
          required
          value={day}
          error={tried ? errors.day : undefined}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>
    </SmallForm>
  );
}

/** « Nouveau tirage »: what a Pay Later finances, in how many months, at
 * what cost; a spend chosen fills its label and amount. */
export function DrawForm({
  lines,
  spends,
  onDone,
}: {
  lines: CreditLine[];
  // The spends not paid yet nor financed already.
  spends: FinanceSpend[];
  onDone: () => void;
}) {
  const t = fr.fundings.payLater.drawForm;
  const submit = useWriteSubmit(onDone, "");
  const live = lines.filter((l) => !l.archived);
  const [lineId, setLineId] = useState(live[0]?.id ?? "");
  const [spendId, setSpendId] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [drawnOn, setDrawnOn] = useState(todayInParis());
  const [installments, setInstallments] = useState("3");
  const [fee, setFee] = useState("0");
  const [tried, setTried] = useState(false);
  const feeValue = Number(fee.replace(",", "."));
  const errors = {
    line: lineId ? undefined : t.errors.line,
    label: label.trim() ? undefined : t.errors.label,
    amount: positive(amount) ? undefined : t.errors.amount,
    drawnOn: drawnOn ? undefined : t.errors.drawnOn,
    installments: whole(installments, 1, 60)
      ? undefined
      : t.errors.installments,
    fee:
      fee.trim() && Number.isFinite(feeValue) && feeValue >= 0 && feeValue <= 50
        ? undefined
        : t.errors.fee,
  };
  const shown = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!Object.values(errors).some(Boolean))
          submit.run(() =>
            addCreditDraw({
              creditLineId: lineId,
              lineId: spendId,
              label,
              amount,
              drawnOn,
              installments: Number(installments),
              feePercent: feeValue,
            }),
          );
      }}
    >
      <Select
        id="draw-line"
        label={t.line}
        options={Object.fromEntries(live.map((l) => [l.id, l.name]))}
        value={lineId}
        onChange={setLineId}
        error={shown("line")}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="draw-spend">{t.spend}</Label>
        <SearchSelect
          id="draw-spend"
          label={t.spend}
          options={{
            "": t.noSpend,
            ...Object.fromEntries(
              spends.map((s) => [
                s.id,
                `${s.label} · ${formatAmount(spendTtc(s), { ht: false })}`,
              ]),
            ),
          }}
          value={spendId}
          onChange={(id) => {
            setSpendId(id);
            const spend = spends.find((s) => s.id === id);
            if (spend) {
              setLabel(spend.label);
              setAmount(amountInput(spendTtc(spend)));
            }
          }}
          searchPlaceholder={fr.treasury.incomeForm.search}
          emptyLabel={fr.treasury.incomeForm.noMatch}
          fill
        />
      </div>
      <Field
        name="draw-label"
        label={t.label}
        required
        maxLength={200}
        autoComplete="off"
        value={label}
        error={shown("label")}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="draw-amount"
          label={t.amount}
          suffix="€"
          required
          inputMode="decimal"
          value={amount}
          error={shown("amount")}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field
          name="draw-on"
          type="date"
          label={t.drawnOn}
          required
          value={drawnOn}
          error={shown("drawnOn")}
          onChange={(e) => setDrawnOn(e.target.value)}
        />
        <Field
          name="draw-installments"
          label={t.installments}
          required
          inputMode="numeric"
          value={installments}
          error={shown("installments")}
          onChange={(e) => setInstallments(e.target.value)}
        />
        <Field
          name="draw-fee"
          label={t.fee}
          suffix="%"
          required
          inputMode="decimal"
          hint={t.feeHint}
          value={fee}
          error={shown("fee")}
          onChange={(e) => setFee(e.target.value)}
        />
      </div>
    </SmallForm>
  );
}
