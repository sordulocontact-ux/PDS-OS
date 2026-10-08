"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  DECLARATION_STATUSES,
  type MasterDeclaration,
  type Organism,
} from "@/lib/catalog/master/rules";
import { saveDeclaration } from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

export function DeclarationForm({
  masterId,
  organism,
  declaration,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  organism: Organism;
  declaration: MasterDeclaration | null;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.declarations;
  // A noted declaration is filed at least: "À déposer" is its absence.
  const statuses = Object.fromEntries(
    DECLARATION_STATUSES.map((status) => [status, t.statuses[status]]),
  );
  return (
    <MasterForm
      action={saveDeclaration}
      defaults={defaults}
      hidden={{ masterId, organism }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <OptionSelect
            name="status"
            label={t.fields.status}
            required
            items={statuses}
            defaultValue={value("status", declaration?.status ?? "submitted")}
            error={error("status")}
          />
          <Field
            name="reference"
            label={t.fields.reference}
            autoFocus
            autoComplete="off"
            maxLength={100}
            defaultValue={value("reference", declaration?.reference)}
            error={error("reference")}
          />
          <Field
            name="date"
            type="date"
            label={t.fields.date}
            defaultValue={value("date", declaration?.date)}
            error={error("date")}
          />
          <TextareaField
            name="notes"
            label={t.fields.notes}
            rows={3}
            maxLength={2000}
            defaultValue={value("notes", declaration?.notes)}
            error={error("notes")}
          />
        </>
      )}
    </MasterForm>
  );
}
