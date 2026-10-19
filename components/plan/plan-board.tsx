"use client";

import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { OptionSelect } from "@/components/framing/option-select";
import { PlanColumns } from "@/components/plan/plan-columns";
import { PlanLaunchReview } from "@/components/plan/plan-launch-review";
import { PlanStepCard } from "@/components/plan/plan-step-card";
import { PlanStepForm } from "@/components/plan/plan-step-form";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { launchProjectPlan } from "@/lib/plan/actions";
import {
  MARKETING_PARTS,
  PLAN_COLUMNS,
  type PlanColumn,
  type PlanWorkflow,
  type ProposedItem,
} from "@/lib/plan/propose";
import type { PlanStepValues } from "@/lib/plan/step-actions";
import { stepIssues, stepStatus, type PlanStep } from "@/lib/plan/steps";
import type {
  Dependency,
  WorkflowKey,
  WorkflowState,
} from "@/lib/workflow-status/rules";

type Draft = ProposedItem & {
  removed: boolean;
  order: number;
  added: boolean;
};

export type PlanContext = {
  states: Partial<Record<WorkflowKey, WorkflowState | "restricted">>;
  targetDate: string | null;
  // The workflows a change of the validated Brief puts back to review.
  review: Partial<Record<PlanWorkflow, string[]>>;
  dependencies: Dependency[];
};

/**
 * The plan PO proposes (ticket § 9, PROJ-UX-07), in its four columns, each
 * step with its real state, pilot, executor, due date, dependencies and
 * what does not hold. « Modifier le plan » lets the owner change a step,
 * reorder it, take it out or add one; « Lancer le plan » shows what starts
 * before recording it. Nothing is launched before.
 */
export function PlanBoard({
  projectId,
  items,
  members,
  editable,
  context,
}: {
  projectId: string;
  items: ProposedItem[];
  members: Array<{ personId: string; name: string }>;
  editable: boolean;
  context: PlanContext;
}) {
  const t = fr.framingIntel.plan;
  const tj = fr.framingJourney.plan;
  const ts = fr.planSteps;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { pending, run, error, setError } = useWriteSubmit(() => {
    setConfirming(false);
    router.refresh();
  }, fr.framingJourney.done.planLaunched);
  const [editing, setEditing] = useState(false);
  // « Annuler » brings back the plan as it was before « Modifier le plan ».
  const [saved, setSaved] = useState<Draft[] | null>(null);
  const nextAdded = useRef(1);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    items.map((item, index) => ({
      ...item,
      removed: false,
      order: index,
      added: false,
    })),
  );
  const update = (key: string, change: Partial<Draft>) =>
    setDrafts((all) =>
      all.map((d) => (d.key === key ? { ...d, ...change } : d)),
    );
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? null;
  const kept = drafts.filter((d) => !d.removed);
  const asSteps: PlanStep[] = kept.map((d) => ({
    key: d.key,
    column: d.column,
    workflow: d.workflow,
    title: d.title,
    ownerPersonId: d.ownerPersonId,
    executorPersonId: d.executorPersonId,
    dueDate: d.dueDate,
    dependsOn: d.dependsOn,
  }));
  const review = new Map(
    Object.entries(context.review) as Array<[PlanWorkflow, string[]]>,
  );
  const issuesOf = (step: PlanStep) =>
    step.column === "anticipate" && !step.workflow
      ? []
      : stepIssues(step, asSteps, { ...context, review });
  const issueCount = asSteps.reduce((n, s) => n + issuesOf(s).length, 0);
  const inColumn = (column: PlanColumn) =>
    kept.filter((d) => d.column === column).sort((a, b) => a.order - b.order);
  // Swaps a step with its neighbour in the same column.
  const move = (draft: Draft, offset: -1 | 1) => {
    const list = inColumn(draft.column);
    const other = list[list.indexOf(draft) + offset];
    if (!other) return;
    update(draft.key, { order: other.order });
    update(other.key, { order: draft.order });
  };
  const valuesOf = (d: Draft): PlanStepValues => ({
    column: d.column,
    title: d.added ? d.title : null,
    ownerPersonId: d.ownerPersonId,
    executorPersonId: d.executorPersonId,
    dueDate: d.dueDate,
    dependsOn: d.dependsOn,
  });
  const apply = (key: string, v: PlanStepValues) => {
    update(key, {
      column: v.column,
      ...(v.title ? { title: v.title } : {}),
      ownerPersonId: v.ownerPersonId ?? null,
      executorPersonId: v.executorPersonId ?? null,
      dueDate: v.dueDate ?? null,
      dependsOn: (v.dependsOn ?? []) as PlanWorkflow[],
    });
    return Promise.resolve({ ok: true as const });
  };
  const removed = drafts.filter((d) => d.removed);

  return (
    <div className="flex flex-col gap-6">
      <PlanColumns
        cards={
          Object.fromEntries(
            PLAN_COLUMNS.map((column) => [
              column,
              inColumn(column).map((d, index, list) => {
                const step = asSteps.find((x) => x.key === d.key)!;
                const note = d.workflow === null && !d.added;
                return (
                  <PlanStepCard
                    key={d.key}
                    stepKey={d.key}
                    title={d.title}
                    group={
                      d.workflow && MARKETING_PARTS.includes(d.workflow)
                        ? tj.group
                        : null
                    }
                    why={d.why || null}
                    specialized={d.specialized}
                    // Before the launch, « Non démarré » says nothing.
                    status={
                      stepStatus(d, context.states) === "not_started"
                        ? null
                        : stepStatus(d, context.states)
                    }
                    pilot={nameOf(d.ownerPersonId)}
                    dueDate={d.dueDate}
                    issues={issuesOf(step)}
                    muted={note}
                    below={
                      editing &&
                      !note && (
                        <div className="grid gap-2 pt-1 sm:grid-cols-2">
                          <OptionSelect
                            id={`plan-column-${d.key}`}
                            label={tj.columnOf(d.title)}
                            options={t.columns}
                            value={d.column}
                            onChange={(v) =>
                              update(d.key, { column: v as PlanColumn })
                            }
                          />
                          <OptionSelect
                            id={`plan-pilot-${d.key}`}
                            label={tj.pilotOf(d.title)}
                            options={Object.fromEntries(
                              members.map((m) => [m.personId, m.name]),
                            )}
                            value={d.ownerPersonId ?? ""}
                            onChange={(v) =>
                              update(d.key, { ownerPersonId: v || null })
                            }
                          />
                        </div>
                      )
                    }
                    actions={
                      editing && (
                        <>
                          {!note && (
                            <DialogButton
                              label={ts.edit}
                              title={ts.editTitle}
                              description={ts.editBodyDraft}
                              size="xs"
                            >
                              {(close) => (
                                <PlanStepForm
                                  initial={valuesOf(d)}
                                  workflow={d.workflow}
                                  members={members}
                                  withTitle={d.added}
                                  submitLabel={ts.save}
                                  doneMessage={ts.saved}
                                  run={(v) => apply(d.key, v)}
                                  onDone={close}
                                />
                              )}
                            </DialogButton>
                          )}
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={ts.moveUp}
                            disabled={index === 0}
                            onClick={() => move(d, -1)}
                          >
                            <IconChevronUp aria-hidden />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={ts.moveDown}
                            disabled={index === list.length - 1}
                            onClick={() => move(d, 1)}
                          >
                            <IconChevronDown aria-hidden />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => update(d.key, { removed: true })}
                          >
                            {t.remove}
                          </Button>
                        </>
                      )
                    }
                  />
                );
              }),
            ]),
          ) as Record<PlanColumn, React.ReactNode[]>
        }
      />

      {removed.length > 0 && (
        <section aria-labelledby="plan-removed" className="flex flex-col gap-2">
          <h3 id="plan-removed" className="text-body-md font-semibold">
            {t.removedTitle}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {removed.map((d) => (
              <li key={d.key} className="flex items-center gap-2 text-body-md">
                <span className="text-muted-foreground line-through decoration-1">
                  {d.title}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => update(d.key, { removed: false })}
                >
                  {t.restore}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editable && (
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  setSaved(null);
                  toast.success(tj.saved);
                }}
              >
                {tj.save}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (saved) setDrafts(saved);
                  setSaved(null);
                  setEditing(false);
                }}
              >
                {tj.cancel}
              </Button>
              <DialogButton
                label={ts.add}
                icon={IconPlus}
                variant="ghost"
                title={ts.addTitle}
                description={ts.addBody}
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
                    submitLabel={ts.add}
                    doneMessage={ts.addedToast}
                    run={(v) => {
                      const key = `added-${nextAdded.current++}`;
                      setDrafts((all) => [
                        ...all,
                        {
                          key,
                          column: v.column,
                          workflow: null,
                          title: v.title ?? "",
                          why: "",
                          dependsOn: (v.dependsOn ?? []) as PlanWorkflow[],
                          specialized: null,
                          ownerPersonId: v.ownerPersonId ?? null,
                          executorPersonId: v.executorPersonId ?? null,
                          dueDate: v.dueDate ?? null,
                          removed: false,
                          order: all.length,
                          added: true,
                        },
                      ]);
                      return Promise.resolve({ ok: true as const });
                    }}
                    onDone={close}
                  />
                )}
              </DialogButton>
            </>
          ) : (
            <>
              <Button onClick={() => setConfirming(true)}>{t.launch}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSaved(drafts);
                  setEditing(true);
                }}
              >
                {t.edit}
              </Button>
            </>
          )}
        </div>
      )}
      <FormDialog
        open={confirming}
        onOpenChange={(open) => {
          setError(null);
          setConfirming(open);
        }}
        title={ts.review.title}
        description={ts.review.body}
        closeLabel={fr.dialogs.close}
      >
        <PlanLaunchReview
          steps={drafts.map((d) => ({
            key: d.key,
            title: d.title,
            workflow: d.workflow,
            column: d.column,
            removed: d.removed,
            pilot: nameOf(d.ownerPersonId) ?? t.noOwner,
            dueDate: d.dueDate,
            note: d.workflow === null && !d.added,
          }))}
          issueCount={issueCount}
          pending={pending}
          error={error}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            run(() =>
              launchProjectPlan(
                projectId,
                drafts
                  .filter((d) => !d.added)
                  .map((d) => ({
                    key: d.key,
                    column: d.column,
                    removed: d.removed,
                    ownerPersonId: d.ownerPersonId,
                    executorPersonId: d.executorPersonId,
                    dueDate: d.dueDate,
                    dependsOn: d.dependsOn,
                    order: d.order,
                  })),
                drafts
                  .filter((d) => d.added)
                  .map((d) => ({
                    key: d.key,
                    title: d.title,
                    column: d.column,
                    removed: d.removed,
                    ownerPersonId: d.ownerPersonId,
                    executorPersonId: d.executorPersonId,
                    dueDate: d.dueDate,
                    dependsOn: d.dependsOn,
                    order: d.order,
                  })),
              ),
            )
          }
        />
      </FormDialog>
    </div>
  );
}
