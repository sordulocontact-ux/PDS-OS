"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { removeExportCheck } from "@/lib/production/delivery/checklist-actions";
import type {
  ExportCheckLine,
  ExportLineState,
} from "@/lib/production/delivery/rules";

import { ExportCheckForm } from "./export-check-form";
import { ExportPointsForm } from "./export-points-form";

const fr = { productionDelivery, productionClosure };

const t = fr.productionDelivery;
const p = fr.productionClosure.points;

/** A line's check, point by point once its file is deposited, and its
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
  const [dialog, setDialog] = useState<"check" | "edit" | "remove" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setDialog(null);
  };

  const remove = () =>
    startTransition(async () => {
      const result = await removeExportCheck({ projectId, checkId: line.id });
      if (!result.ok) return setError(result.error);
      toast.success(t.checklist.removeDialog.done);
      close();
    });

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {line.url && (
        <Button
          size="sm"
          variant={state === "ok" ? "ghost" : "outline"}
          onClick={() => setDialog("check")}
        >
          {state === "stale" || state === "ok"
            ? p.again
            : line.points.length > 0
              ? p.resume
              : p.open}
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
        open={dialog === "check"}
        onOpenChange={(open) => !open && close()}
        title={p.dialogTitle(line.label)}
        description={p.dialogDescription}
        closeLabel={t.close}
      >
        <ExportPointsForm projectId={projectId} line={line} onDone={close} />
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
