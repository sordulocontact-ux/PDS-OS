"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { PrepResult } from "@/lib/production/prep-result";
import {
  saveShootReportNote,
  validateShootReport,
} from "@/lib/production/shoot/shoot-actions";

const fr = { productionShoot };

const t = fr.productionShoot.report;

/** The report's note, « Enregistrer la note », and « Valider le compte
 * rendu » once the shoot ended and while it is not validated. */
export function ReportValidateForm({
  projectId,
  sheetId,
  note,
  canValidate,
}: {
  projectId: string;
  sheetId: string;
  note: string | null;
  canValidate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(form: HTMLFormElement, validate: boolean) {
    const value = String(new FormData(form).get("note") ?? "");
    setError(null);
    startTransition(async () => {
      const task: () => Promise<PrepResult> = validate
        ? () => validateShootReport({ projectId, sheetId, note: value })
        : () => saveShootReportNote({ projectId, sheetId, note: value });
      const result = await task();
      if (!result.ok) return setError(result.error);
      toast.success(validate ? t.validatedDone : t.noteSaved);
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(event.currentTarget, canValidate);
      }}
    >
      <TextareaField
        id="shoot-report-note"
        name="note"
        label={t.note}
        rows={3}
        maxLength={4000}
        placeholder={t.notePlaceholder}
        defaultValue={note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant={canValidate ? "ghost" : "default"}
          size="lg"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) run(form, false);
          }}
        >
          {t.saveNote}
        </Button>
        {canValidate && (
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? t.validating : t.validate}
          </Button>
        )}
      </div>
    </form>
  );
}
