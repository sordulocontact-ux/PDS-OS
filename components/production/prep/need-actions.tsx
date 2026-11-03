"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { IconUserPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import type { Member } from "@/lib/framing/related";
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import { deleteProductionNeed } from "@/lib/production/needs-actions";
import type { NetworkOption, ProductionNeed } from "@/lib/production/sheet";

import { AssignmentForm } from "./assignment-form";
import { NeedForm } from "./need-form";
import { needLabel } from "./need-label";

const fr = { productionNeeds };

const t = fr.productionNeeds;

/** A position's « Affecter » (while places remain) and its « ⋯ »: Modifier,
 * Supprimer (confirmed). */
export function NeedActions({
  projectId,
  sheetId,
  need,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  need: ProductionNeed;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [dialog, setDialog] = useState<"assign" | "edit" | "delete" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = needLabel(need);
  const full = need.assignments.length >= need.headcount;
  const close = () => {
    setError(null);
    setDialog(null);
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deleteProductionNeed({ projectId, needId: need.id });
      if (!result.ok) return setError(result.error);
      toast.success(t.remove.done);
      close();
    });

  return (
    <div className="flex shrink-0 items-center gap-1">
      {!full && (
        <Button variant="outline" size="sm" onClick={() => setDialog("assign")}>
          <IconUserPlus aria-hidden data-icon="inline-start" />
          {t.assign.open}
        </Button>
      )}
      <RowActions
        label={t.needMenu(label)}
        actions={[
          {
            key: "edit",
            label: t.editAction,
            icon: IconPenWriting2,
            onSelect: () => setDialog("edit"),
          },
          {
            key: "delete",
            label: t.remove.action,
            icon: IconTrash,
            onSelect: () => setDialog("delete"),
          },
        ]}
      />
      <FormDialog
        open={dialog === "assign"}
        onOpenChange={(open) => !open && close()}
        title={t.assign.title(label)}
        description={t.assign.description}
        closeLabel={t.close}
      >
        <AssignmentForm
          projectId={projectId}
          need={need}
          members={members}
          contacts={contacts}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && close()}
        title={t.edit.title(label)}
        description={t.edit.description}
        closeLabel={t.close}
      >
        <NeedForm
          projectId={projectId}
          sheetId={sheetId}
          family={need.family}
          draft={{ need, roleKey: null, suggestedBecause: null }}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && close()}
        title={t.remove.title}
        description={t.remove.body(label)}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.remove.confirm}
        pendingLabel={t.remove.pending}
        pending={pending}
        destructive
        error={error}
        onConfirm={remove}
      />
    </div>
  );
}
