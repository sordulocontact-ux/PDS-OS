"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconCheck,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { PrepResult } from "@/lib/production/prep-result";
import {
  deleteShootIncident,
  resolveShootIncident,
} from "@/lib/production/shoot/incident-actions";
import type { ShootIncident } from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";

import { IncidentForm } from "./incident-form";
import { IncidentResolveForm } from "./incident-resolve-form";

const t = fr.productionShoot.incidents;

type Dialog = "edit" | "resolve" | "reopen" | "delete";

/** An incident's « ⋯ »: Modifier, Résoudre (with what was done) or Rouvrir
 * (confirmed), Supprimer (confirmed, definitive). */
export function IncidentActions({
  projectId,
  sheetId,
  incident,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  incident: ShootIncident;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setDialog(null);
  };
  const confirm = (task: () => Promise<PrepResult>, done: string) =>
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return setError(result.error);
      toast.success(done);
      close();
    });
  const resolved = incident.resolvedAt !== null;

  const actions: RowAction[] = [
    {
      key: "edit",
      label: t.editAction,
      icon: IconPenWriting2,
      onSelect: () => setDialog("edit"),
    },
    resolved
      ? {
          key: "reopen",
          label: t.reopenAction,
          icon: IconArrowDottedRotateAnticlockwise,
          onSelect: () => setDialog("reopen"),
        }
      : {
          key: "resolve",
          label: t.resolveAction,
          icon: IconCheck,
          onSelect: () => setDialog("resolve"),
        },
    {
      key: "delete",
      label: t.deleteAction,
      icon: IconTrash,
      onSelect: () => setDialog("delete"),
    },
  ];

  return (
    <>
      <RowActions label={t.menu(incident.title)} actions={actions} />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && close()}
        title={t.editTitle}
        description={t.editDescription}
        closeLabel={fr.productionShoot.close}
      >
        <IncidentForm
          projectId={projectId}
          sheetId={sheetId}
          draft={{ incident }}
          members={members}
          contacts={contacts}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "resolve"}
        onOpenChange={(open) => !open && close()}
        title={t.resolveTitle}
        description={t.resolveDescription}
        closeLabel={fr.productionShoot.close}
      >
        <IncidentResolveForm
          projectId={projectId}
          incidentId={incident.id}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "reopen"}
        onOpenChange={(open) => !open && close()}
        title={t.reopenTitle}
        description={t.reopenDescription}
        cancelLabel={fr.productionShoot.cancel}
        closeLabel={fr.productionShoot.close}
        confirmLabel={t.reopenConfirm}
        pendingLabel={fr.productionShoot.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          confirm(
            () =>
              resolveShootIncident({
                projectId,
                incidentId: incident.id,
                resolution: "",
              }),
            t.reopened,
          )
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && close()}
        title={t.deleteTitle}
        description={t.deleteDescription}
        cancelLabel={fr.productionShoot.cancel}
        closeLabel={fr.productionShoot.close}
        confirmLabel={t.deleteConfirm}
        pendingLabel={fr.productionShoot.saving}
        pending={pending}
        destructive
        error={error}
        onConfirm={() =>
          confirm(
            () => deleteShootIncident({ projectId, incidentId: incident.id }),
            t.deleted,
          )
        }
      />
    </>
  );
}
