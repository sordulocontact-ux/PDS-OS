"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import {
  removeProductionAssignment,
  setAssignmentAvailability,
} from "@/lib/production/needs-actions";
import type { ProductionAssignment } from "@/lib/production/sheet";

import { AvailabilityChoices, availabilityOf } from "./assignment-availability";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";

const fr = { productionNeeds };

const t = fr.productionNeeds.assignment;

/** « ⋯ » of a person on a position: Changer la disponibilité, Retirer du
 * poste (confirmed). */
export function AssignmentActions({
  projectId,
  assignment,
  needLabel,
}: {
  projectId: string;
  assignment: ProductionAssignment;
  needLabel: string;
}) {
  const [dialog, setDialog] = useState<"availability" | "remove" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = assignment.holder.name;
  const close = () => {
    setError(null);
    setDialog(null);
  };

  const remove = () =>
    startTransition(async () => {
      const result = await removeProductionAssignment({
        projectId,
        assignmentId: assignment.id,
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.removed);
      close();
    });

  return (
    <>
      <RowActions
        label={t.menu(name)}
        actions={[
          {
            key: "availability",
            label: t.change,
            icon: IconPenWriting2,
            onSelect: () => setDialog("availability"),
          },
          {
            key: "remove",
            label: t.remove,
            icon: IconTrash,
            onSelect: () => setDialog("remove"),
          },
        ]}
      />
      <FormDialog
        open={dialog === "availability"}
        onOpenChange={(open) => !open && close()}
        title={t.changeTitle(name)}
        description={t.changeDescription}
        closeLabel={fr.productionNeeds.close}
      >
        <AvailabilityForm
          projectId={projectId}
          assignment={assignment}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(open) => !open && close()}
        title={t.removeTitle}
        description={t.removeBody(name, needLabel)}
        cancelLabel={fr.productionNeeds.cancel}
        closeLabel={fr.productionNeeds.close}
        confirmLabel={t.removeConfirm}
        pendingLabel={t.removePending}
        pending={pending}
        destructive
        error={error}
        onConfirm={remove}
      />
    </>
  );
}

function AvailabilityForm({
  projectId,
  assignment,
  onDone,
}: {
  projectId: string;
  assignment: ProductionAssignment;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.changed);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() =>
          setAssignmentAvailability({
            projectId,
            assignmentId: assignment.id,
            availability: availabilityOf(data.get("availability")),
            note: String(data.get("note") ?? ""),
          }),
        );
      }}
    >
      <AvailabilityChoices
        name="availability"
        defaultValue={assignment.availability}
      />
      <TextareaField
        id={`availability-${assignment.id}-note`}
        name="note"
        label={t.note}
        rows={2}
        maxLength={500}
        placeholder={t.notePlaceholder}
        defaultValue={assignment.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.changeSubmit}
        onCancel={onDone}
      />
    </form>
  );
}
