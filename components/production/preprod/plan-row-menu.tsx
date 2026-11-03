"use client";

import {
  IconArrowDottedRotateAnticlockwise as IconBack,
  IconCheck,
  IconTasks2,
  IconTrash,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import type { RowAction } from "@/components/ui/row-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Member } from "@/lib/framing/related";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  deletePlanAction,
  setPlanStatus,
} from "@/lib/production/preprod/actions-plan";
import type { PlanAction } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";

import { PlanActionForm } from "./plan-action-form";
import { PlanTaskForm } from "./plan-task-form";
import { RecordMenu } from "@/components/ui/record-menu";

const fr = { productionPreprod };

const t = fr.productionPreprod.plan;

/** The « ⋯ » of a plan action: approve, back to draft, remove or restore,
 * « Créer dans Travail » (confirmed in its own modal), edit, delete. An
 * action already in Travail only shows there. */
export function PlanRowMenu({
  projectId,
  sheetId,
  action,
  dependencies,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  action: PlanAction;
  dependencies: { id: string; title: string }[];
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [, startTransition] = useTransition();
  if (action.taskId) return null;

  const status = (next: "draft" | "approved" | "removed") =>
    startTransition(async () => {
      const result = await setPlanStatus({
        projectId,
        actionIds: [action.id],
        status: next,
      });
      if (result.ok) toast.success(t.statusDone);
      else toast.error(result.error);
    });
  const extra: RowAction[] =
    action.status === "removed"
      ? [
          {
            key: "restore",
            label: t.restore,
            icon: IconBack,
            onSelect: () => status("draft"),
          },
        ]
      : [
          action.status === "draft"
            ? {
                key: "approve",
                label: t.approve,
                icon: IconCheck,
                onSelect: () => status("approved"),
              }
            : {
                key: "task",
                label: t.task,
                icon: IconTasks2,
                onSelect: () => setTaskOpen(true),
              },
          ...(action.status === "approved"
            ? [
                {
                  key: "draft",
                  label: t.toDraft,
                  icon: IconBack,
                  onSelect: () => status("draft"),
                },
              ]
            : []),
          {
            key: "remove",
            label: t.removeAction,
            icon: IconTrash,
            onSelect: () => status("removed"),
          },
        ];

  return (
    <>
      <RecordMenu
        label={action.title}
        extra={extra}
        edit={{
          title: t.editTitle,
          description: t.formDescription,
          form: (close) => (
            <PlanActionForm
              projectId={projectId}
              sheetId={sheetId}
              action={action}
              dependencies={dependencies}
              members={members}
              contacts={contacts}
              onDone={close}
            />
          ),
        }}
        remove={{
          title: t.deleteTitle,
          body: t.deleteBody,
          done: t.deleted,
          run: () => deletePlanAction({ projectId, actionId: action.id }),
        }}
      />
      <FormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        title={t.taskTitle}
        description={t.taskDescription}
        closeLabel={fr.productionPreprod.close}
      >
        <PlanTaskForm
          projectId={projectId}
          action={action}
          members={members}
          onDone={() => setTaskOpen(false)}
        />
      </FormDialog>
    </>
  );
}
