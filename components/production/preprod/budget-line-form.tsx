"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { centsToInput } from "@/lib/budget/types";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  addBudgetLine,
  deleteBudgetLine,
  updateBudgetLine,
} from "@/lib/production/preprod/actions-budget";
import {
  BUDGET_CATEGORIES,
  PREPROD_BUDGET_STATUSES,
  budgetCategoryOf,
  preprodBudgetStatusOf,
  type PreprodBudgetLine,
} from "@/lib/production/preprod/types";

import { DialogButton } from "@/components/ui/dialog-button";
import { RecordMenu } from "@/components/ui/record-menu";

const fr = { productionPreprod };

const t = fr.productionPreprod.budget;

type Props = {
  projectId: string;
  sheetId: string;
  // Equipment lines an estimate may point to, with the quoted price.
  equipment: {
    id: string;
    label: string;
    priceCents: number | null;
    supplierName: string | null;
  }[];
};

type Equipment = Props["equipment"][number];

export function AddBudgetLineButton(props: Props) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.formDescription}
    >
      {(close) => <BudgetLineForm {...props} line={null} onDone={close} />}
    </DialogButton>
  );
}

export function BudgetLineMenu({
  line,
  ...props
}: Props & { line: PreprodBudgetLine }) {
  return (
    <RecordMenu
      label={line.label}
      edit={{
        title: t.editTitle(line.label),
        description: t.formDescription,
        form: (close) => (
          <BudgetLineForm {...props} line={line} onDone={close} />
        ),
      }}
      remove={{
        title: t.deleteTitle,
        body: t.deleteBody(line.label),
        done: t.deleted,
        run: () =>
          deleteBudgetLine({ projectId: props.projectId, lineId: line.id }),
      }}
    />
  );
}

/** One estimate: position, category, amount (only « À estimer » goes
 * without), state chosen by the person, an equipment line if it is one. A
 * new line pointing to an equipment line takes its label and quoted price,
 * said so, still editable (PROD-003). */
function BudgetLineForm({
  projectId,
  sheetId,
  equipment,
  line,
  onDone,
}: Props & { line: PreprodBudgetLine | null; onDone: () => void }) {
  const { pending, error, run } = useWriteSubmit(
    onDone,
    line ? t.updated : t.added,
  );
  const id = line ? `budget-${line.id}` : "budget-new";
  const [picked, setPicked] = useState<Equipment | null>(null);
  // Remounts the prefilled fields when another equipment line is picked.
  const seed = picked?.id ?? "none";
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const values = {
          projectId,
          label: text("label"),
          category: budgetCategoryOf(data.get("category")),
          amount: text("amount"),
          status: preprodBudgetStatusOf(data.get("status")),
          equipmentId: text("equipmentId"),
          note: text("note"),
        };
        run(() =>
          line
            ? updateBudgetLine({ ...values, lineId: line.id })
            : addBudgetLine({ ...values, sheetId }),
        );
      }}
    >
      {/* First: picking an equipment line fills what it knows. */}
      {equipment.length > 0 && (
        <OptionSelect
          id={`${id}-equipment`}
          name="equipmentId"
          label={t.fields.equipment}
          items={{
            none: t.noEquipment,
            ...Object.fromEntries(equipment.map((e) => [e.id, e.label])),
          }}
          defaultValue={line?.equipmentId ?? "none"}
          onValueChange={(value) => {
            if (!line) setPicked(equipment.find((e) => e.id === value) ?? null);
          }}
        />
      )}
      <Field
        id={`${id}-label`}
        name="label"
        label={t.fields.label}
        required
        maxLength={200}
        defaultValue={line?.label ?? picked?.label ?? ""}
        key={`label-${seed}`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id={`${id}-category`}
          name="category"
          label={t.fields.category}
          required
          items={Object.fromEntries(
            BUDGET_CATEGORIES.map((c) => [c, t.categories[c]]),
          )}
          defaultValue={line?.category ?? (picked ? "equipment" : "production")}
          key={`category-${seed}`}
        />
        <OptionSelect
          id={`${id}-status`}
          name="status"
          label={t.fields.status}
          required
          items={Object.fromEntries(
            PREPROD_BUDGET_STATUSES.map((s) => [s, t.statuses[s]]),
          )}
          defaultValue={
            line?.status ??
            (picked?.priceCents != null ? "estimated" : "to_estimate")
          }
          key={`status-${seed}`}
        />
      </div>
      <Field
        id={`${id}-amount`}
        name="amount"
        label={t.fields.amount}
        suffix="€"
        inputMode="decimal"
        hint={
          !line && picked?.priceCents != null
            ? t.fromQuote(picked.label, picked.supplierName)
            : t.amountRequired
        }
        defaultValue={
          line?.amountCents != null
            ? centsToInput(line.amountCents)
            : !line && picked?.priceCents != null
              ? centsToInput(picked.priceCents)
              : ""
        }
        key={`amount-${seed}`}
      />
      <TextareaField
        id={`${id}-note`}
        name="note"
        label={t.fields.note}
        rows={2}
        maxLength={1000}
        defaultValue={line?.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
