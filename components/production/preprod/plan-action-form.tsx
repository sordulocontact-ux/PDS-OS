"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { usePrepSubmit } from "@/components/production/prep/use-prep-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  addPlanAction,
  updatePlanAction,
} from "@/lib/production/preprod/actions-plan";
import type { PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";
import { jsonListOf } from "@/lib/utils/form-data";

import { holderItems, holderValue } from "./holder-items";

const t = fr.productionPreprod.plan;

/** « Ajouter une action » / « Modifier »: what, who is pressenti, when, what
 * it waits for, whether it blocks the shoot. */
export function PlanActionForm({
  projectId,
  sheetId,
  action,
  dependencies,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  action: PlanAction | null;
  // The other actions it may wait for.
  dependencies: { id: string; title: string }[];
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const { pending, error, run } = usePrepSubmit(
    onDone,
    action ? t.updated : t.added,
  );
  const id = action ? `plan-${action.id}` : "plan-new";
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = {
          projectId,
          title: String(data.get("title") ?? ""),
          holder: String(data.get("holder") ?? ""),
          dueDate: String(data.get("dueDate") ?? ""),
          dependsOn: jsonListOf(data.get("dependsOn")),
          blocking: data.get("blocking") === "on",
          note: String(data.get("note") ?? ""),
        };
        run(() =>
          action
            ? updatePlanAction({ ...values, actionId: action.id })
            : addPlanAction({ ...values, sheetId }),
        );
      }}
    >
      <Field
        id={`${id}-title`}
        name="title"
        label={t.fields.title}
        required
        maxLength={300}
        defaultValue={action?.title ?? ""}
      />
      <OptionSelect
        id={`${id}-holder`}
        name="holder"
        label={t.fields.holder}
        items={holderItems(members, contacts)}
        defaultValue={holderValue(action?.holder ?? null)}
      />
      <Field
        id={`${id}-due`}
        name="dueDate"
        type="date"
        label={t.fields.due}
        defaultValue={action?.dueDate ?? ""}
      />
      {dependencies.length > 0 && (
        <OptionSelect
          id={`${id}-depends`}
          name="dependsOn"
          label={t.fields.dependsOn}
          multiple
          max={50}
          items={Object.fromEntries(dependencies.map((d) => [d.id, d.title]))}
          defaultValue={action?.dependsOn ?? []}
        />
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-blocking`}
          name="blocking"
          defaultChecked={action?.blocking ?? false}
        />
        <Label htmlFor={`${id}-blocking`}>{t.fields.blocking}</Label>
      </div>
      <TextareaField
        id={`${id}-note`}
        name="note"
        label={t.fields.note}
        rows={2}
        maxLength={1000}
        defaultValue={action?.note ?? ""}
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
