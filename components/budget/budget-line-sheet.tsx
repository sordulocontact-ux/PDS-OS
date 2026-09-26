"use client";

import { useState } from "react";
import { toast } from "sonner";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { saveBudgetLine } from "@/lib/budget/actions";
import {
  centsToInput,
  isBudgetStatus,
  type BudgetLever,
  type BudgetLine,
  type BudgetStatus,
} from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

const NONE = "none";

// Side panel to add a line (line = null) or edit one. Mounted per opening,
// so the fields always start from the saved values.
export function BudgetLineSheet({
  projectId,
  line,
  levers,
  open,
  onOpenChange,
}: {
  projectId: string;
  line: BudgetLine | null;
  levers: BudgetLever[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.budget.form;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-5 pt-5 pr-14">
          <SheetTitle>{line ? t.editTitle : t.newTitle}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        {open && (
          <LineForm
            projectId={projectId}
            line={line}
            levers={levers}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function LineForm({
  projectId,
  line,
  levers,
  onDone,
}: {
  projectId: string;
  line: BudgetLine | null;
  levers: BudgetLever[];
  onDone: () => void;
}) {
  const t = fr.budget.form;
  const { pending, run } = useFramingAction();
  const [status, setStatus] = useState<BudgetStatus>(line?.status ?? "planned");
  const [family, setFamily] = useState<string>(line?.family ?? NONE);
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
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="budget-label">{t.label}</Label>
        <Input
          id="budget-label"
          name="label"
          required
          maxLength={200}
          defaultValue={line?.label}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-amount">{t.amount}</Label>
        <Input
          id="budget-amount"
          name="amount"
          required
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={amountError || undefined}
          aria-describedby="budget-amount-hint"
          defaultValue={line ? centsToInput(line.amountCents) : ""}
        />
        <p
          id="budget-amount-hint"
          className={
            amountError
              ? "text-caption text-destructive"
              : "text-caption text-muted-foreground"
          }
        >
          {amountError ? t.invalidAmount : t.amountHint}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-status">{t.status}</Label>
        <OptionSelect
          id="budget-status"
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
          defaultValue={line?.note ?? ""}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
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
