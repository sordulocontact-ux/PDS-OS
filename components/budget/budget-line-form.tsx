"use client";

import { useState } from "react";
import { toast } from "sonner";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBudgetLine } from "@/lib/budget/actions";
import {
  centsToInput,
  isBudgetStatus,
  type BudgetFamily,
  type BudgetLever,
  type BudgetLine,
  type BudgetStatus,
} from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

const NONE = "none";

/**
 * A line's fields. `initial`: a new line already filled (a draft of PO).
 * `onCancel`: when cancelling is not just closing (PO's panel).
 */
export function BudgetLineForm({
  projectId,
  line,
  initial,
  levers,
  onDone,
  onCancel = onDone,
}: {
  projectId: string;
  line: BudgetLine | null;
  initial?: {
    label: string;
    amount: string;
    status: BudgetStatus | null;
    family: BudgetFamily | null;
    note: string;
  };
  levers: BudgetLever[];
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.budget.form;
  const { pending, run } = useFramingAction();
  const [status, setStatus] = useState<BudgetStatus>(
    line?.status ?? initial?.status ?? "planned",
  );
  const [family, setFamily] = useState<string>(
    line?.family ?? initial?.family ?? NONE,
  );
  const [leverId, setLeverId] = useState<string>(line?.leverId ?? NONE);
  const [amountError, setAmountError] = useState(false);

  const families = {
    [NONE]: t.none,
    ...fr.framing.needs.families,
  };
  const leverOptions = {
    [NONE]: t.none,
    ...Object.fromEntries(levers.map((l) => [l.id, l.label])),
  };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "");
    setAmountError(false);
    run(
      async () => {
        const result = await saveBudgetLine(projectId, {
          id: line?.id,
          label: String(form.get("label") ?? ""),
          amount,
          status,
          family: family === NONE ? "" : family,
          leverId: leverId === NONE ? "" : leverId,
          note: String(form.get("note") ?? ""),
        });
        if (!result.ok && result.error === "invalid_input")
          setAmountError(true);
        return result;
      },
      () => {
        toast.success(t.saved);
        onDone();
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="budget-label" required>
          {t.label}
        </Label>
        <Input
          id="budget-label"
          name="label"
          required
          maxLength={200}
          defaultValue={line?.label ?? initial?.label}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-amount" required>
          {t.amount}
        </Label>
        <Input
          id="budget-amount"
          name="amount"
          required
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={amountError || undefined}
          aria-describedby="budget-amount-hint"
          defaultValue={
            line ? centsToInput(line.amountCents) : (initial?.amount ?? "")
          }
        />
        <p
          id="budget-amount-hint"
          className={
            amountError
              ? "text-caption text-error"
              : "text-caption text-muted-foreground"
          }
        >
          {amountError ? t.invalidAmount : t.amountHint}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-status" required>
          {t.status}
        </Label>
        <OptionSelect
          id="budget-status"
          required
          label={t.status}
          options={fr.budget.statuses}
          value={status}
          onChange={(v) => isBudgetStatus(v) && setStatus(v)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-family">{t.family}</Label>
        <OptionSelect
          id="budget-family"
          label={t.family}
          options={families}
          value={family}
          onChange={setFamily}
        />
      </div>
      {levers.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="budget-lever">{t.lever}</Label>
          <OptionSelect
            id="budget-lever"
            label={t.lever}
            options={leverOptions}
            value={leverId}
            onChange={setLeverId}
          />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="budget-note">{t.note}</Label>
        <Textarea
          id="budget-note"
          name="note"
          maxLength={1000}
          defaultValue={line?.note ?? initial?.note ?? ""}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
