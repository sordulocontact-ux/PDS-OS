"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/framing/related";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { setPlanStatus } from "@/lib/production/preprod/actions-plan";
import { planFromCallItems } from "@/lib/production/preprod/actions-plan-task";
import type { ActionState } from "@/lib/production/preprod/plan";
import type { PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";

import { DialogButton } from "@/components/ui/dialog-button";
import { PlanActionForm } from "./plan-action-form";
import { PlanTable } from "./plan-table";
import { PlanTemplateControls } from "./plan-template-controls";
import type { Reschedule } from "@/lib/production/preprod/plan-template";

const fr = { productionPreprod };

const t = fr.productionPreprod.plan;

/**
 * The plan's working surface: « Reprendre les actions du call » (drafts,
 * nobody guessed), « Ajouter une action », a selection of drafts approved
 * at once, the table, and the removed actions under their fold.
 */
export function PlanBoard({
  projectId,
  sheetId,
  actions,
  states,
  fromCall,
  members,
  contacts,
  canOrganize,
  template,
}: {
  projectId: string;
  sheetId: string;
  // The proposed plan (PROD-006, PROD-010).
  template: {
    deliverableId: string;
    missing: number;
    reschedule: Reschedule[];
  };
  actions: PlanAction[];
  states: Record<string, ActionState>;
  // Confirmed action points of the call not yet in the plan.
  fromCall: number;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const live = actions.filter((a) => a.status !== "removed");
  const removed = actions.filter((a) => a.status === "removed");
  const shown = [...selected].filter((id) =>
    live.some((a) => a.id === id && a.status === "draft"),
  );

  const run = (task: () => ReturnType<typeof setPlanStatus>, done: string) =>
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      setSelected(new Set());
    });
  const table = (rows: PlanAction[]) => (
    <PlanTable
      projectId={projectId}
      sheetId={sheetId}
      actions={rows}
      all={actions}
      states={states}
      members={members}
      contacts={contacts}
      canOrganize={canOrganize}
      selected={selected}
      onSelect={(id, on) =>
        setSelected((set) => {
          const next = new Set(set);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        })
      }
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {canOrganize && (
        <div className="flex flex-wrap items-center gap-2">
          <PlanTemplateControls
            projectId={projectId}
            deliverableId={template.deliverableId}
            missing={template.missing}
            hasPlan={live.length > 0}
            reschedule={template.reschedule}
          />
          {fromCall > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => planFromCallItems({ projectId, sheetId }),
                  t.fromCallDone,
                )
              }
            >
              {t.fromCall(fromCall)}
            </Button>
          )}
          <DialogButton
            label={t.add}
            icon={IconPlus}
            title={t.addTitle}
            description={t.formDescription}
          >
            {(close) => (
              <PlanActionForm
                projectId={projectId}
                sheetId={sheetId}
                action={null}
                dependencies={live.map((a) => ({ id: a.id, title: a.title }))}
                members={members}
                contacts={contacts}
                onDone={close}
              />
            )}
          </DialogButton>
          {shown.length > 0 && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    setPlanStatus({
                      projectId,
                      actionIds: shown,
                      status: "approved",
                    }),
                  t.approved,
                )
              }
            >
              {t.approveSelection(shown.length)}
            </Button>
          )}
        </div>
      )}
      {live.length > 0 ? table(live) : <EmptyNote>{t.empty}</EmptyNote>}
      {removed.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {t.removedCount(removed.length)}
          </summary>
          <div className="mt-3">{table(removed)}</div>
        </details>
      )}
    </div>
  );
}
