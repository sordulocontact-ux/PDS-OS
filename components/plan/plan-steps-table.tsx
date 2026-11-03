"use client";

import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPenWriting2,
  IconPlus,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { PlanStepForm } from "@/components/plan/plan-step-form";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { DataTableViews } from "@/components/ui/data-table-views";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/lib/ui/state-tones";
import { formatBriefDate } from "@/lib/framing/assess";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { planSteps } from "@/lib/i18n/fr/plan-steps";
import type { PlanWorkflow } from "@/lib/plan/propose";
import {
  addPlanStep,
  movePlanStep,
  setPlanStepDone,
  updatePlanStep,
  type PlanStepValues,
} from "@/lib/plan/step-actions";
import type { StepIssue } from "@/lib/plan/steps";

const fr = { dialogs, framingIntel, planSteps };

export type StepGroup = "active" | "next" | "blocked" | "done";

export type StepRow = {
  id: string;
  title: string;
  workflow: PlanWorkflow | null;
  group: StepGroup;
  statusLabel: string;
  statusTone: Tone;
  pilot: string | null;
  executor: string | null;
  dueDate: string | null;
  dependsOn: string[];
  issues: StepIssue[];
  values: PlanStepValues;
  first: boolean;
  last: boolean;
  doneAt: string | null;
};

const VIEWS = ["all", "active", "next", "blocked", "done"] as const;

/**
 * The launched plan, step by step (PROJ-UX-07): real state, pilot,
 * executor, due date, dependencies and what does not hold, filtered by
 * state. The owner changes, adds, moves or marks an added step done; every
 * change goes to the plan's history.
 */
export function PlanStepsTable({
  projectId,
  rows,
  members,
  editable,
}: {
  projectId: string;
  rows: StepRow[];
  members: Array<{ personId: string; name: string }>;
  editable: boolean;
}) {
  const t = fr.planSteps;
  const [view, setView] = useState<(typeof VIEWS)[number]>("all");
  const [editing, setEditing] = useState<StepRow | null>(null);
  const [, startTransition] = useTransition();
  const shown = view === "all" ? rows : rows.filter((r) => r.group === view);
  const act = (task: () => ReturnType<typeof movePlanStep>, done: string) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) toast.success(done);
      else toast.error(result.error);
    });
  const actionsOf = (row: StepRow): RowAction[] =>
    editable
      ? [
          {
            key: "edit",
            label: t.edit,
            icon: IconPenWriting2,
            onSelect: () => setEditing(row),
          },
          ...(row.first
            ? []
            : [
                {
                  key: "up",
                  label: t.moveUp,
                  icon: IconChevronUp,
                  onSelect: () =>
                    act(() => movePlanStep(projectId, row.id, -1), t.moved),
                },
              ]),
          ...(row.last
            ? []
            : [
                {
                  key: "down",
                  label: t.moveDown,
                  icon: IconChevronDown,
                  onSelect: () =>
                    act(() => movePlanStep(projectId, row.id, 1), t.moved),
                },
              ]),
          ...(row.workflow === null
            ? [
                {
                  key: "done",
                  label: row.doneAt ? t.reopen : t.markDone,
                  icon: IconCheck,
                  onSelect: () =>
                    act(
                      () => setPlanStepDone(projectId, row.id, !row.doneAt),
                      row.doneAt ? t.reopenedToast : t.doneToast,
                    ),
                },
              ]
            : []),
        ]
      : [];

  return (
    <>
      <DataTableViews
        label={t.board.title}
        views={VIEWS.map((v) => ({
          label: t.board.views[v],
          count:
            v === "all"
              ? rows.length
              : rows.filter((r) => r.group === v).length,
          current: view === v,
          onSelect: () => setView(v),
        }))}
        action={
          editable && (
            <DialogButton
              label={t.add}
              icon={IconPlus}
              size="sm"
              title={t.addTitle}
              description={t.addBody}
            >
              {(close) => (
                <PlanStepForm
                  initial={{
                    column: "meanwhile",
                    title: "",
                    ownerPersonId: null,
                    executorPersonId: null,
                    dueDate: null,
                    dependsOn: [],
                  }}
                  workflow={null}
                  members={members}
                  withTitle
                  submitLabel={t.add}
                  doneMessage={t.addedToast}
                  run={(v) => addPlanStep(projectId, v)}
                  onDone={close}
                />
              )}
            </DialogButton>
          )
        }
      >
        {shown.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.board.empty}</p>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHead>{t.board.step}</DataTableHead>
              <DataTableHead>{t.status}</DataTableHead>
              <DataTableHead hideBelow="md">{t.pilot}</DataTableHead>
              <DataTableHead hideBelow="lg">{t.executor}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.due}</DataTableHead>
              <DataTableHead hideBelow="lg" fill>
                {t.dependsOn}
              </DataTableHead>
              {editable && <DataTableActionsHead label={t.edit} />}
            </DataTableHeader>
            <DataTableBody>
              {shown.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="align-top">
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold break-words">
                        {row.title}
                      </span>
                      {row.issues.map((issue) =>
                        issue.href ? (
                          <Link
                            key={issue.text}
                            href={issue.href}
                            className="text-caption text-[color:var(--tone-warning-fg)] underline underline-offset-4"
                          >
                            {issue.text}
                          </Link>
                        ) : (
                          <span
                            key={issue.text}
                            className="text-caption text-[color:var(--tone-warning-fg)]"
                          >
                            {issue.text}
                          </span>
                        ),
                      )}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="align-top">
                    <StatusBadge tone={row.statusTone} size="sm">
                      {row.statusLabel}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell hideBelow="md" className="align-top">
                    {row.pilot ?? fr.framingIntel.plan.noOwner}
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" className="align-top">
                    {row.executor ?? t.executorSame}
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="align-top">
                    {row.dueDate ? formatBriefDate(row.dueDate) : t.noDue}
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" fill className="align-top">
                    {row.dependsOn.length
                      ? row.dependsOn.join(", ")
                      : EMPTY_CELL}
                  </DataTableCell>
                  {editable && (
                    <DataTableActionsCell>
                      <RowActions
                        label={`${t.edit} · ${row.title}`}
                        actions={actionsOf(row)}
                      />
                    </DataTableActionsCell>
                  )}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableViews>
      <FormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={t.editTitle}
        description={t.editBody}
        closeLabel={fr.dialogs.close}
      >
        {editing && (
          <PlanStepForm
            initial={editing.values}
            workflow={editing.workflow}
            members={members}
            withTitle={editing.workflow === null}
            submitLabel={t.save}
            doneMessage={t.saved}
            run={(v) => updatePlanStep(projectId, editing.id, v)}
            onDone={() => setEditing(null)}
          />
        )}
      </FormDialog>
    </>
  );
}
