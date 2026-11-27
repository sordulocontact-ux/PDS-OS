"use client";

import { IconMinus, IconPenWriting2, IconPhone } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { IconUserPlus } from "@/components/icons";
import type { Credit } from "@/components/projects/titles/board-rows";
import { PlanCallDialog } from "@/components/projects/titles/recap-edits";
import { ParticipationStatusForm } from "@/components/projects/titles/title-forms";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import type { SharedNegotiationCall } from "@/lib/deals/negotiation-call-rules";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setTitleParticipationStatus } from "@/lib/projects/participation-actions";
import { isActiveParticipation } from "@/lib/projects/participation-rules";
import type { RecapParticipation } from "@/lib/projects/recap-rules";

const fr = { dealCalls, dialogs, projectTitles };

/** « ⋯ » of an artist's row and of its side sheet: « Caler le call » when
 * the row may plan it (`call`, Maël 25/11/2026: no button in the table),
 * the artist's gestures
 * — change its status (modal), withdraw it from the title (détacher,
 * confirmed) or bring a declined or withdrawn one back (rattacher, at once,
 * « À contacter » again) — then its title's (`titleActions`). */
export function TitleRowMenu({
  projectId,
  participation,
  label,
  credit,
  canManage,
  call,
  titleActions,
}: {
  projectId: string;
  participation: RecapParticipation;
  label: string;
  credit: Credit;
  // The artist's own gestures (not on a title abandoned).
  canManage: boolean;
  // « Caler le call »'s shared data, when the row may plan it.
  call: SharedNegotiationCall | null;
  titleActions: RowAction[];
}) {
  const t = fr.projectTitles.participations;
  const [open, setOpen] = useState<"status" | "withdraw" | "call" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(null);
    setError(null);
  };
  const setStatus = (status: "withdrawn" | "proposed", done: string) =>
    startTransition(async () => {
      const result = await setTitleParticipationStatus({
        projectId,
        participationId: participation.id,
        status,
      });
      if (!result.ok) {
        if (status === "withdrawn") return void setError(result.error);
        return void toast.error(result.error);
      }
      // A credit written on the way is said by the action's own message;
      // the period added as usePublishResult does.
      toast.success(`${status === "proposed" ? done : (result.done ?? done)}.`);
      close();
    });
  const active = isActiveParticipation(participation.status);
  const accord = participation.recap.accord;
  const planCall: RowAction[] =
    call && accord
      ? [
          {
            key: "call",
            label: fr.dealCalls.negotiation.button,
            icon: IconPhone,
            onSelect: () => setOpen("call"),
          },
        ]
      : [];
  const own: RowAction[] = canManage
    ? [
        {
          key: "status",
          label: t.status.action,
          icon: IconPenWriting2,
          onSelect: () => setOpen("status"),
        },
        active
          ? {
              key: "withdraw",
              label: t.withdraw.action,
              icon: IconMinus,
              onSelect: () => setOpen("withdraw"),
            }
          : {
              key: "reattach",
              label: t.reattach.action,
              icon: IconUserPlus,
              onSelect: () => setStatus("proposed", t.reattach.done),
            },
      ]
    : [];

  return (
    <>
      <RowActions
        label={t.menu(participation.artist.name, label)}
        actions={[...planCall, ...own, ...titleActions]}
      />
      {call && accord && (
        <PlanCallDialog
          shared={call}
          accord={accord}
          open={open === "call"}
          onOpenChange={(next) => !next && close()}
        />
      )}
      {canManage && (
        <>
          <FormDialog
            open={open === "status"}
            onOpenChange={(next) => !next && close()}
            title={t.status.title(participation.artist.name, label)}
            description={t.status.description(credit.mode, credit.shared)}
            closeLabel={fr.dialogs.close}
          >
            <ParticipationStatusForm
              projectId={projectId}
              participation={participation}
              onDone={close}
            />
          </FormDialog>
          <ConfirmDialog
            open={open === "withdraw"}
            onOpenChange={(next) => !next && close()}
            title={t.withdraw.title(participation.artist.name, label)}
            description={t.withdraw.description}
            cancelLabel={fr.dialogs.cancel}
            closeLabel={fr.dialogs.close}
            confirmLabel={t.withdraw.submit}
            pendingLabel={t.withdraw.pending}
            pending={pending}
            error={error}
            onConfirm={() => setStatus("withdrawn", t.withdraw.done)}
          />
        </>
      )}
    </>
  );
}
