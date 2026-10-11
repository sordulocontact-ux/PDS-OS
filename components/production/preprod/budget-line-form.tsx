"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
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

const t = fr.productionPreprod.budget;

type Props = {
  projectId: string;
  sheetId: string;
  // Equipment lines an estimate may point to.
  equipment: { id: string; label: string }[];
};

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
 * without), state chosen by the person, an equipment line if it is one. */
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
      <Field
        id={`${id}-label`}
        name="label"
        label={t.fields.label}
        required
        maxLength={200}
        defaultValue={line?.label ?? ""}
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
          defaultValue={line?.category ?? "production"}
        />
        <OptionSelect
          id={`${id}-status`}
          name="status"
          label={t.fields.status}
          required
          items={Object.fromEntries(
            PREPROD_BUDGET_STATUSES.map((s) => [s, t.statuses[s]]),
          )}
          defaultValue={line?.status ?? "to_estimate"}
        />
      </div>
      <Field
        id={`${id}-amount`}
        name="amount"
        label={t.fields.amount}
        suffix="€"
        inputMode="decimal"
        hint={t.amountRequired}
        defaultValue={
          line?.amountCents == null ? "" : centsToInput(line.amountCents)
        }
      />
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
        />
      )}
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
