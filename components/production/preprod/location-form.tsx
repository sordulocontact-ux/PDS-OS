"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { saveLocation } from "@/lib/production/preprod/actions-logistics";
import type { SheetLogistics } from "@/lib/production/sheet";

import { DialogButton } from "@/components/ui/dialog-button";

const t = fr.productionPreprod.location;
const STATUSES = ["to_find", "to_verify", "confirmed"] as const;

/** « Modifier le lieu »: its state (pressenti ≠ confirmed), name, address,
 * access and notes. */
export function LocationEditButton({
  projectId,
  sheetId,
  logistics,
}: {
  projectId: string;
  sheetId: string;
  logistics: SheetLogistics;
}) {
  return (
    <DialogButton
      label={t.edit}
      title={t.editTitle}
      description={t.description}
    >
      {(close) => (
        <LocationForm
          projectId={projectId}
          sheetId={sheetId}
          logistics={logistics}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function LocationForm({
  projectId,
  sheetId,
  logistics: l,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  logistics: SheetLogistics;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const status =
          STATUSES.find((s) => s === data.get("status")) ?? "to_find";
        run(() =>
          saveLocation({
            projectId,
            sheetId,
            status,
            name: text("name"),
            address: text("address"),
            access: text("access"),
            notes: text("notes"),
          }),
        );
      }}
    >
      <ChoiceCards
        name="status"
        legend={t.fields.status}
        required
        defaultValue={l.locationStatus}
        choices={STATUSES.map((s) => ({
          value: s,
          label: t.statuses[s],
          hint: t.statusHints[s],
        }))}
      />
      <Field
        id="location-name"
        name="name"
        label={t.fields.name}
        maxLength={200}
        defaultValue={l.locationName ?? ""}
      />
      <Field
        id="location-address"
        name="address"
        label={t.fields.address}
        maxLength={500}
        defaultValue={l.locationAddress ?? ""}
      />
      <TextareaField
        id="location-access"
        name="access"
        label={t.fields.access}
        rows={3}
        maxLength={2000}
        defaultValue={l.locationAccess ?? ""}
      />
      <TextareaField
        id="location-notes"
        name="notes"
        label={t.fields.notes}
        rows={2}
        maxLength={2000}
        defaultValue={l.locationNotes ?? ""}
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
