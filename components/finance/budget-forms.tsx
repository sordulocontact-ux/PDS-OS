"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  createCostCenter,
  renameCostCenter,
  reviseCostCenter,
  saveTemplate,
  setPdsShare,
} from "@/lib/finance/budget-actions";
import type {
  BudgetTemplate,
  TemplateLine,
} from "@/lib/finance/budget-queries";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { treasury } from "@/lib/i18n/fr/treasury";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets, treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const positive = (value: string) => {
  const cents = parseEurosToCents(value);
  return cents !== null && cents !== undefined && cents > 0;
};

/** « Nouveau centre de coût », empty or from a template (an emission, a
 * live, a shooting: its lines copied as planned spends). */
export function CostCenterForm({
  templates,
  initialTemplateId = "",
  onDone,
}: {
  templates: BudgetTemplate[];
  // A template's card opens the form already on it.
  initialTemplateId?: string;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.centerForm;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [tried, setTried] = useState(false);
  const template = templates.find((x) => x.id === templateId);
  const total = template?.lines.reduce((s, l) => s + l.cents, 0) ?? 0;
  const errors = {
    name: name.trim() ? undefined : t.errors.name,
    amount:
      value.trim() && !positive(value)
        ? t.errors.amount
        : !value.trim() && !template
          ? t.errors.amount
          : undefined,
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (errors.name || errors.amount) return;
        submit.run(() => createCostCenter({ name, amount: value, templateId }));
      }}
    >
      <Field
        name="center-name"
        label={t.name}
        required
        maxLength={120}
        autoComplete="off"
        value={name}
        error={tried ? errors.name : undefined}
        onChange={(e) => setName(e.target.value)}
      />
      {templates.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="center-template">{t.template}</Label>
          <SearchSelect
            id="center-template"
            label={t.template}
            options={{
              "": t.noTemplate,
              ...Object.fromEntries(templates.map((x) => [x.id, x.name])),
            }}
            value={templateId}
            onChange={setTemplateId}
            searchPlaceholder={fr.treasury.incomeForm.search}
            emptyLabel={fr.treasury.incomeForm.noMatch}
            fill
          />
          {template && (
            <p className="text-caption text-[color:var(--text-secondary)]">
              {t.templateTotal(template.lines.length, amount(total))}
            </p>
          )}
        </div>
      )}
      <Field
        name="center-amount"
        label={t.amount}
        suffix="€"
        inputMode="decimal"
        autoComplete="off"
        required={!template}
        hint={template ? t.amountHint : undefined}
        value={value}
        error={tried ? errors.amount : undefined}
        onChange={(e) => setValue(e.target.value)}
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

/** « Renommer » a cost center. */
export function RenameForm({
  id,
  name: current,
  onDone,
}: {
  id: string;
  name: string;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.renameForm;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState(current);
  const [tried, setTried] = useState(false);
  const error = name.trim() ? undefined : t.errors.name;
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (error) return;
        submit.run(() => renameCostCenter({ id, name }));
      }}
    >
      <Field
        name="rename-center"
        label={t.name}
        required
        maxLength={120}
        autoComplete="off"
        value={name}
        error={tried ? error : undefined}
        onChange={(e) => setName(e.target.value)}
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

/** « Réviser l'enveloppe » of a cost center: the new amount and why. */
export function ReviseForm({
  id,
  currentCents,
  onDone,
}: {
  id: string;
  currentCents: number | null;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.reviseForm;
  const submit = useWriteSubmit(onDone, "");
  const [value, setValue] = useState(
    currentCents === null ? "" : amountInput(currentCents),
  );
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const errors = {
    amount: positive(value) ? undefined : t.errors.amount,
    reason: reason.trim() ? undefined : t.errors.reason,
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (errors.amount || errors.reason) return;
        submit.run(() => reviseCostCenter({ id, amount: value, reason }));
      }}
    >
      <Field
        name="revise-amount"
        label={t.amount}
        suffix="€"
        required
        inputMode="decimal"
        autoComplete="off"
        value={value}
        error={tried ? errors.amount : undefined}
        onChange={(e) => setValue(e.target.value)}
      />
      <TextareaField
        name="revise-reason"
        label={t.reason}
        required
        maxLength={500}
        rows={2}
        value={reason}
        error={tried ? errors.reason : undefined}
        onChange={(e) => setReason(e.target.value)}
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

/** « Part financée par PDS », 0 to 100 %. */
export function ShareForm({
  kind,
  id,
  shareBp,
  onDone,
}: {
  kind: EnvelopeKind;
  id: string;
  shareBp: number;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.shareForm;
  const submit = useWriteSubmit(onDone, "");
  const [value, setValue] = useState(String(shareBp / 100).replace(".", ","));
  const [tried, setTried] = useState(false);
  const percent = Number(value.replace(",", ".").replace("%", "").trim());
  const error =
    value.trim() && Number.isFinite(percent) && percent >= 0 && percent <= 100
      ? undefined
      : t.error;
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (error) return;
        submit.run(() => setPdsShare({ kind, id, percent }));
      }}
    >
      <Field
        name="share-percent"
        label={t.percent}
        suffix="%"
        required
        inputMode="decimal"
        autoComplete="off"
        value={value}
        error={tried ? error : undefined}
        onChange={(e) => setValue(e.target.value)}
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

/** « Enregistrer comme modèle »: the envelope's lines, named. */
export function TemplateForm({
  lines,
  onDone,
}: {
  lines: TemplateLine[];
  onDone: () => void;
}) {
  const t = fr.financeBudgets.templateForm;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const error = name.trim() ? undefined : t.error;
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (error) return;
        submit.run(() => saveTemplate({ name, lines }));
      }}
    >
      <Field
        name="template-name"
        label={t.name}
        required
        maxLength={120}
        autoComplete="off"
        value={name}
        error={tried ? error : undefined}
        onChange={(e) => setName(e.target.value)}
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
