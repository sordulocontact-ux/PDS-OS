"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveSession } from "@/lib/catalog/master/item-actions";
import type { MasterSession } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

export function SessionForm({
  masterId,
  session,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  session: MasterSession | null;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.sessions;
  const optional = fr.masterPage.form.optional;
  return (
    <MasterForm
      action={saveSession}
      defaults={defaults}
      hidden={{ masterId, itemId: session?.id }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <OptionSelect
            name="kind"
            label={t.fields.kind}
            items={t.kinds}
            defaultValue={value("kind", session?.kind ?? "recording")}
            error={error("kind")}
          />
          <Field
            name="date"
            type="date"
            label={t.fields.date}
            hint={optional}
            defaultValue={value("date", session?.date)}
            error={error("date")}
          />
          <Field
            name="studio"
            label={t.fields.studio}
            hint={optional}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("studio", session?.studio)}
            error={error("studio")}
          />
          <Field
            name="engineer"
            label={t.fields.engineer}
            hint={optional}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("engineer", session?.engineer)}
            error={error("engineer")}
          />
          <TextareaField
            name="notes"
            label={t.fields.notes}
            hint={optional}
            rows={3}
            maxLength={2000}
            defaultValue={value("notes", session?.notes)}
            error={error("notes")}
          />
        </>
      )}
    </MasterForm>
  );
}
