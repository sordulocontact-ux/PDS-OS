"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { saveSchedule } from "@/lib/production/preprod/actions-logistics";
import type { SheetLogistics } from "@/lib/production/sheet";

import { DialogButton } from "@/components/ui/dialog-button";

const t = fr.productionPreprod.schedule;

type Dates = Pick<
  SheetLogistics,
  "shootDate" | "postStart" | "postEnd" | "deliveryDate" | "budgetEnvelopeCents"
>;

/** « Modifier les dates »: Production's own dates and envelope; empty, the
 * Fiche Livrable's apply (shown under each field). */
export function ScheduleEditButton({
  projectId,
  sheetId,
  own,
  fiche,
}: {
  projectId: string;
  sheetId: string;
  own: Dates;
  // The Fiche's values, already formatted (null = none).
  fiche: Record<keyof Dates, string | null>;
}) {
  return (
    <DialogButton
      label={t.editDates}
      title={t.datesTitle}
      description={t.datesDescription}
    >
      {(close) => (
        <ScheduleForm
          projectId={projectId}
          sheetId={sheetId}
          own={own}
          fiche={fiche}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ScheduleForm({
  projectId,
  sheetId,
  own,
  fiche,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  own: Dates;
  fiche: Record<keyof Dates, string | null>;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  const hint = (key: keyof Dates) =>
    fiche[key] ? t.ficheValue(fiche[key]) : undefined;
  const date = (key: Exclude<keyof Dates, "budgetEnvelopeCents">) => (
    <Field
      id={`schedule-${key}`}
      name={key}
      type="date"
      label={t.fields[key]}
      hint={hint(key)}
      defaultValue={own[key] ?? ""}
    />
  );
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        run(() =>
          saveSchedule({
            projectId,
            sheetId,
            shootDate: text("shootDate"),
            postStart: text("postStart"),
            postEnd: text("postEnd"),
            deliveryDate: text("deliveryDate"),
            envelope: text("envelope"),
          }),
        );
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {date("shootDate")}
        {date("deliveryDate")}
        {date("postStart")}
        {date("postEnd")}
      </div>
      <Field
        id="schedule-envelope"
        name="envelope"
        label={t.fields.envelope}
        suffix="€"
        inputMode="decimal"
        hint={hint("budgetEnvelopeCents")}
        defaultValue={
          own.budgetEnvelopeCents === null
            ? ""
            : centsToInput(own.budgetEnvelopeCents)
        }
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
