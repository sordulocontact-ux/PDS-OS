"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";
import {
  removeExportCheck,
  setExportCheckResult,
} from "@/lib/production/delivery/checklist-actions";
import type {
  ExportCheckLine,
  ExportLineState,
} from "@/lib/production/delivery/rules";

import { ExportCheckForm } from "./export-check-form";
import { NotOkForm } from "./not-ok-form";

const t = fr.productionDelivery;

/** A line's check (« Conforme », « Non conforme » with a note) and its
 * « ⋯ »: Modifier, Retirer (confirmed). The owner, while Production runs. */
export function ExportCheckActions({
  projectId,
  sheetId,
  line,
  state,
}: {
  projectId: string;
  sheetId: string;
  line: ExportCheckLine;
  state: ExportLineState;
}) {
  const [dialog, setDialog] = useState<"not_ok" | "edit" | "remove" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setDialog(null);
  };

  const markOk = () =>
    startTransition(async () => {
      const result = await setExportCheckResult({
        projectId,
        checkId: line.id,
        result: "ok",
        note: "",
      });
      if (result.ok) toast.success(t.checklist.marked);
      else toast.error(result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await removeExportCheck({ projectId, checkId: line.id });
      if (!result.ok) return setError(result.error);
      toast.success(t.checklist.removeDialog.done);
      close();
    });

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {state !== "ok" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={markOk}
        >
          {state === "stale" ? t.checklist.recheck : t.checklist.markOk}
        </Button>
      )}
      {state !== "not_ok" && (
        <Button size="sm" variant="ghost" onClick={() => setDialog("not_ok")}>
          {t.checklist.markNotOk}
        </Button>
      )}
      <RowActions
        label={t.checklist.menu(line.label)}
        actions={[
          {
            key: "edit",
            label: t.checklist.edit,
            icon: IconPenWriting2,
            onSelect: () => setDialog("edit"),
          },
          {
            key: "remove",
            label: t.checklist.remove,
            icon: IconTrash,
            onSelect: () => setDialog("remove"),
          },
        ]}
      />
      <FormDialog
        open={dialog === "not_ok"}
        onOpenChange={(open) => !open && close()}
        title={t.checklist.notOk.title(line.label)}
        description={t.checklist.notOk.description}
        closeLabel={t.close}
      >
        <NotOkForm
          projectId={projectId}
          checkId={line.id}
          note={line.result === "not_ok" ? line.note : null}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && close()}
        title={t.checklist.form.editTitle}
        description={t.checklist.form.description}
        closeLabel={t.close}
      >
        <ExportCheckForm
          projectId={projectId}
          sheetId={sheetId}
          line={line}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(open) => !open && close()}
        title={t.checklist.removeDialog.title}
        description={t.checklist.removeDialog.body(line.label)}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.checklist.removeDialog.confirm}
        pendingLabel={t.checklist.removeDialog.pending}
        pending={pending}
        error={error}
        onConfirm={remove}
      />
    </div>
  );
}
