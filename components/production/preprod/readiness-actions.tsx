"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { usePrepSubmit } from "@/components/production/prep/use-prep-submit";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  markProductionReady,
  setReadinessCheck,
} from "@/lib/production/preprod/actions-readiness";
import type { CheckRow } from "@/lib/production/preprod/readiness";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";

const t = fr.productionPreprod.readiness;

/** A check's actions: « Confirmer » (with a note, who and when kept by the
 * database), « Retirer », and whether it is required. */
export function ReadinessActions({
  projectId,
  sheetId,
  row,
}: {
  projectId: string;
  sheetId: string;
  row: CheckRow;
}) {
  const [pending, startTransition] = useTransition();
  const set = (confirmed: boolean | null, required: boolean | null) =>
    startTransition(async () => {
      const result = await setReadinessCheck({
        projectId,
        sheetId,
        key: row.key,
        confirmed,
        required,
        note: "",
      });
      if (result.ok) toast.success(t.done);
      else toast.error(result.error);
    });
  const label = t.checks[row.key];
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => set(null, !row.required)}
      >
        {row.required ? t.unrequire : t.require}
      </Button>
      {row.state === "confirmed" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => set(false, null)}
        >
          {t.withdraw}
        </Button>
      ) : (
        <DialogButton
          label={t.confirm}
          title={t.confirmTitle(label)}
          description={t.confirmDescription}
        >
          {(close) => (
            <ConfirmCheckForm
              projectId={projectId}
              sheetId={sheetId}
              row={row}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </div>
  );
}

function ConfirmCheckForm({
  projectId,
  sheetId,
  row,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  row: CheckRow;
  onDone: () => void;
}) {
  const { pending, error, run } = usePrepSubmit(onDone, t.done);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        run(() =>
          setReadinessCheck({
            projectId,
            sheetId,
            key: row.key,
            confirmed: true,
            required: null,
            note,
          }),
        );
      }}
    >
      <TextareaField
        id={`check-${row.key}-note`}
        name="note"
        label={t.noteLabel}
        rows={2}
        maxLength={1000}
        defaultValue={row.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.confirm}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Marquer prête pour tournage », asked first; the database refuses it
 * while a required check is open. */
export function MarkReadyButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  return (
    <ConfirmButton
      label={t.markReady}
      variant="default"
      size="lg"
      title={t.markReadyTitle}
      body={t.markReadyBody}
      confirmLabel={t.markReady}
      pendingLabel={t.marking}
      done={t.ready}
      run={() => markProductionReady({ projectId, sheetId })}
    />
  );
}
