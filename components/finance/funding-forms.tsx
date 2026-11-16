"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  createCreditLine,
  createShowFormat,
} from "@/lib/finance/funding-actions";
import { fundings } from "@/lib/i18n/fr/fundings";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fr = { fundings };

const positive = (value: string) => {
  const c = parseEurosToCents(value);
  return c !== null && c !== undefined && c > 0;
};
const whole = (value: string, min: number, max: number) => {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
};

/** The shell of every small form of Financements: fields, error, actions. */
function SmallForm({
  submit,
  onSubmit,
  saveLabel,
  savingLabel,
  onCancel,
  children,
}: {
  submit: ReturnType<typeof useWriteSubmit>;
  onSubmit: () => void;
  saveLabel: string;
  savingLabel: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
      <DialogFormActions
        pending={submit.pending}
        submitLabel={saveLabel}
        pendingLabel={savingLabel}
        onCancel={onCancel}
      />
    </form>
  );
}

/** « Nouveau format »: its name, its cost, its provisional titles. */
export function ShowFormatForm({ onDone }: { onDone: () => void }) {
  const t = fr.fundings.formats.form;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [titles, setTitles] = useState("0");
  const [tried, setTried] = useState(false);
  const errors = {
    name: name.trim() ? undefined : t.errors.name,
    cost: positive(cost) ? undefined : t.errors.cost,
    titles: whole(titles, 0, 100) ? undefined : t.errors.titles,
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
            createShowFormat({ name, cost, titles: Number(titles) }),
          );
      }}
    >
      <Field
        name="format-name"
        label={t.name}
        required
        maxLength={80}
        autoComplete="off"
        value={name}
        error={shown("name")}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="format-cost"
          label={t.cost}
          suffix="€"
          required
          inputMode="decimal"
          value={cost}
          error={shown("cost")}
          onChange={(e) => setCost(e.target.value)}
        />
        <Field
          name="format-titles"
          label={t.titles}
          required
          inputMode="numeric"
          value={titles}
          error={shown("titles")}
          onChange={(e) => setTitles(e.target.value)}
        />
      </div>
    </SmallForm>
  );
}

/** « Nouvelle ligne de crédit »: a Pay Later and its limit. */
export function CreditLineForm({ onDone }: { onDone: () => void }) {
  const t = fr.fundings.payLater.lineForm;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [tried, setTried] = useState(false);
  const errors = {
    name: name.trim() ? undefined : t.errors.name,
    limit: positive(limit) ? undefined : t.errors.limit,
  };
  return (
    <SmallForm
      submit={submit}
      saveLabel={t.save}
      savingLabel={t.saving}
      onCancel={onDone}
      onSubmit={() => {
        setTried(true);
        if (!errors.name && !errors.limit)
          submit.run(() => createCreditLine({ name, limit }));
      }}
    >
      <Field
        name="credit-name"
        label={t.name}
        required
        maxLength={80}
        autoComplete="off"
        value={name}
        error={tried ? errors.name : undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        name="credit-limit"
        label={t.limit}
        suffix="€"
        required
        inputMode="decimal"
        value={limit}
        error={tried ? errors.limit : undefined}
        onChange={(e) => setLimit(e.target.value)}
      />
    </SmallForm>
  );
}

export { SmallForm, positive, whole };
