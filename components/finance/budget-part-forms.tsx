"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  saveBudgetPart,
  setPartSpends,
} from "@/lib/finance/budget-envelope-actions";
import type { BudgetPart } from "@/lib/finance/budget-envelope";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** « Ajouter un sous-budget », or change one: its name and its amount. */
export function PartForm({
  kind,
  targetId,
  part,
  onDone,
}: {
  kind: EnvelopeKind;
  targetId: string;
  part: BudgetPart | null;
  onDone: () => void;
}) {
  const t = fr.financeBudgets.partForm;
  const submit = useWriteSubmit(onDone, "");
  const [name, setName] = useState(part?.name ?? "");
  const [value, setValue] = useState(part ? amountInput(part.amountCents) : "");
  const [tried, setTried] = useState(false);
  const cents = parseEurosToCents(value);
  const errors = {
    name: name.trim() ? undefined : t.errors.name,
    amount: cents && cents > 0 ? undefined : t.errors.amount,
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (errors.name || errors.amount) return;
        submit.run(() =>
          saveBudgetPart({ id: part?.id, kind, targetId, name, amount: value }),
        );
      }}
    >
      <Field
        name="part-name"
        label={t.name}
        required
        maxLength={120}
        autoComplete="off"
        value={name}
        error={tried ? errors.name : undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        name="part-amount"
        label={t.amount}
        suffix="€"
        required
        inputMode="decimal"
        autoComplete="off"
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

export type PartCandidate = {
  id: string;
  label: string;
  cents: number;
  // The part it is in now (any of the budget's), if any.
  partId: string | null;
  partName: string | null;
  // Already in no part and named like this one: ticked from the start.
  suggested: boolean;
};

/**
 * « Rattacher des dépenses » to a sub-budget: the budget's spends with a box
 * each. Pre-ticked: what the part already holds, and the spends with no part
 * whose sub-post carries its name. Ticking a spend of another part moves it.
 */
export function AttachSpendsForm({
  part,
  candidates,
  onDone,
}: {
  part: BudgetPart;
  candidates: PartCandidate[];
  onDone: () => void;
}) {
  const t = fr.financeBudgets.attachForm;
  const submit = useWriteSubmit(onDone, "");
  const [ticked, setTicked] = useState(
    () =>
      new Set(
        candidates
          .filter((c) => c.partId === part.id || (!c.partId && c.suggested))
          .map((c) => c.id),
      ),
  );
  const toggle = (id: string, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  if (candidates.length === 0)
    return <FormMessage kind="info">{t.none}</FormMessage>;
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit.run(() =>
          setPartSpends({
            partId: part.id,
            add: candidates
              .filter((c) => ticked.has(c.id) && c.partId !== part.id)
              .map((c) => c.id),
            remove: candidates
              .filter((c) => !ticked.has(c.id) && c.partId === part.id)
              .map((c) => c.id),
          }),
        );
      }}
    >
      <div className="flex flex-col gap-3">
        {candidates.map((c) => (
          <CheckboxField
            key={c.id}
            label={`${c.label} · ${amount(c.cents)}`}
            hint={
              c.partId && c.partId !== part.id && c.partName
                ? t.inPart(c.partName)
                : undefined
            }
            checked={ticked.has(c.id)}
            onChange={(on) => toggle(c.id, on)}
          />
        ))}
      </div>
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
