"use client";

import {
  IconCalendarDays,
  IconCheck,
  IconHandTruck,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { setEquipmentReturnStatus } from "@/lib/production/shoot/return-actions";
import type { ReturnLine, ReturnStatus } from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";

import { ReturnHolderForm, ReturnIncidentForm } from "./equipment-return-forms";
import { IncidentForm } from "./incident-form";

const t = fr.productionShoot.equipment;

type Dialog = "returned" | "incident" | "holder" | "report";

/** A confirmed line's « ⋯ »: picked up, to return, « Rendu » only after a
 * confirmation, a return incident, who brings it back and when; a return
 * incident may be reported as a shoot incident (to decide what it blocks). */
export function EquipmentReturnActions({
  projectId,
  sheetId,
  line,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  line: ReturnLine;
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
  const move = (status: Exclude<ReturnStatus, "booked" | "incident">) =>
    startTransition(async () => {
      const result = await setEquipmentReturnStatus({
        projectId,
        equipmentId: line.id,
        status,
        incidentNote: "",
      });
      if (!result.ok) {
        if (dialog) return setError(result.error);
        return void toast.error(result.error);
      }
      toast.success(t.done);
      close();
    });

  const s = line.status;
  const actions: RowAction[] = [
    ...(s === "booked"
      ? [
          {
            key: "picked_up",
            label: t.actions.pickedUp,
            icon: IconHandTruck,
            onSelect: () => move("picked_up"),
          },
        ]
      : []),
    ...(s === "picked_up"
      ? [
          {
            key: "on_site",
            label: t.actions.onSite,
            icon: IconHandTruck,
            onSelect: () => move("on_site"),
          },
        ]
      : []),
    ...(s !== "to_return"
      ? [
          {
            key: "to_return",
            label: t.actions.toReturn,
            icon: IconHandTruck,
            onSelect: () => move("to_return"),
          },
        ]
      : []),
    ...(s !== "returned"
      ? [
          {
            key: "returned",
            label: t.actions.returned,
            icon: IconCheck,
            onSelect: () => setDialog("returned"),
          },
          {
            key: "incident",
            label: t.actions.incident,
            icon: IconTriangleWarning,
            onSelect: () => setDialog("incident"),
          },
        ]
      : []),
    {
      key: "holder",
      label: t.actions.holder,
      icon: IconCalendarDays,
      onSelect: () => setDialog("holder"),
    },
    ...(s === "incident"
      ? [
          {
            key: "report",
            label: t.actions.report,
            icon: IconTriangleWarning,
            onSelect: () => setDialog("report"),
          },
        ]
      : []),
  ];

  const onOpenChange = (open: boolean) => !open && close();
  return (
    <>
      <RowActions label={t.menu(line.label)} actions={actions} />
      <ConfirmDialog
        open={dialog === "returned"}
        onOpenChange={onOpenChange}
        title={t.confirmReturnTitle(line.label)}
        description={t.confirmReturnDescription}
        cancelLabel={fr.productionShoot.cancel}
        closeLabel={fr.productionShoot.close}
        confirmLabel={t.confirmReturn}
        pendingLabel={fr.productionShoot.saving}
        pending={pending}
        error={error}
        onConfirm={() => move("returned")}
      />
      <FormDialog
        open={dialog === "incident"}
        onOpenChange={onOpenChange}
        title={t.incidentTitle}
        description={t.incidentDescription}
        closeLabel={fr.productionShoot.close}
      >
        <ReturnIncidentForm projectId={projectId} line={line} onDone={close} />
      </FormDialog>
      <FormDialog
        open={dialog === "holder"}
        onOpenChange={onOpenChange}
        title={t.holderTitle}
        description={t.holderDescription}
        closeLabel={fr.productionShoot.close}
      >
        <ReturnHolderForm
          projectId={projectId}
          line={line}
          members={members}
          contacts={contacts}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "report"}
        onOpenChange={onOpenChange}
        title={fr.productionShoot.incidents.addTitle}
        description={fr.productionShoot.incidents.addDescription}
        closeLabel={fr.productionShoot.close}
      >
        <IncidentForm
          projectId={projectId}
          sheetId={sheetId}
          draft={{
            incident: null,
            title: fr.productionShoot.incidents
              .fromEquipment(line.label)
              .slice(0, 200),
            impact: line.incidentNote ?? "",
          }}
          members={members}
          contacts={contacts}
          onDone={close}
        />
      </FormDialog>
    </>
  );
}
