"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { saveCallSheet } from "@/lib/production/preprod/actions-readiness";
import type { CallSheetDefaults } from "@/lib/production/preprod/call-sheet-defaults";
import {
  CALL_SHEET_FIELDS,
  CALL_SHEET_LIMITS,
  type CallSheet,
} from "@/lib/production/preprod/types";

import { DialogButton } from "@/components/ui/dialog-button";

const t = fr.productionPreprod.callSheet;

/** « Compléter la feuille »: its own sections; the team, the place and the
 * equipment come from their sections. An empty section starts from what the
 * brief or the Fiche says, with its source (`proposed`). */
export function CallSheetEditButton({
  projectId,
  sheetId,
  callSheet,
  proposed,
}: {
  projectId: string;
  sheetId: string;
  callSheet: CallSheet | null;
  proposed: CallSheetDefaults;
}) {
  return (
    <DialogButton
      label={t.edit}
      title={t.editTitle}
      description={t.editDescription}
      wide
    >
      {(close) => (
        <CallSheetForm
          projectId={projectId}
          sheetId={sheetId}
          callSheet={callSheet}
          proposed={proposed}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function CallSheetForm({
  projectId,
  sheetId,
  callSheet,
  proposed,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  callSheet: CallSheet | null;
  proposed: CallSheetDefaults;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = Object.fromEntries(
          CALL_SHEET_FIELDS.map((key) => [key, String(data.get(key) ?? "")]),
        ) as Record<(typeof CALL_SHEET_FIELDS)[number], string>;
        run(() => saveCallSheet({ projectId, sheetId, ...values }));
      }}
    >
      {CALL_SHEET_FIELDS.map((key) =>
        key === "callTime" ? (
          <Field
            key={key}
            id={`call-sheet-${key}`}
            name={key}
            label={t.fields[key]}
            maxLength={CALL_SHEET_LIMITS[key]}
            defaultValue={callSheet?.[key] ?? ""}
          />
        ) : (
          <TextareaField
            key={key}
            id={`call-sheet-${key}`}
            name={key}
            label={t.fields[key]}
            rows={3}
            maxLength={CALL_SHEET_LIMITS[key]}
            defaultValue={callSheet?.[key] ?? proposed[key]?.value ?? ""}
            hint={proposed[key] ? t.proposed[proposed[key].source] : undefined}
          />
        ),
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
