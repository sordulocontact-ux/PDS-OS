"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PlanColumns } from "@/components/plan/plan-columns";
import { PlanRowEditor } from "@/components/plan/plan-row-editor";
import { PlanStepCard } from "@/components/plan/plan-step-card";
import { PlanStepForm } from "@/components/plan/plan-step-form";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { SunkCard } from "@/components/ui/sunk-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { planSteps } from "@/lib/i18n/fr/plan-steps";
import { launchProjectPlan } from "@/lib/plan/actions";
import {
  LAUNCHABLE,
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

const fr = { framingIntel, planSteps, framingJourney };

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
 * The plan PO proposes (ticket § 9, PROJ-UX-07; proto « Suite du Cadrage »,
 * Sacha 29/10/2026), in one card: « Proposée par PO à partir du Brief… »,
 * « Ajouter une étape » in its head, the four groups one under the other,
 * each step with its pilot, due date and what does not hold. Its own
 * « Modifier » opens a step in place; under the plan, what « Lancer le
 * plan » starts, said before the gesture. Nothing is recorded before it.
 */
export function PlanBoard({
  projectId,
  items,
  members,
  editable,
  context,
  title,
  meta,
}: {
  projectId: string;
  items: ProposedItem[];
  members: Array<{ personId: string; name: string }>;
  editable: boolean;
  context: PlanContext;
  title: string;
  meta: string;
}) {
  const t = fr.framingIntel.plan;
  const tj = fr.framingJourney.plan;
  const ts = fr.planSteps;
  const { pending, run, error } = useWriteSubmit(
    undefined,
    fr.framingJourney.done.planLaunched,
  );
  const [editing, setEditing] = useState<string | null>(null);
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
  // Every workflow of the plan starts (migration 20261019020101).
  const starting = kept
    .filter((d) => d.workflow !== null && LAUNCHABLE.includes(d.workflow))
    .sort(
      (a, b) =>
        PLAN_COLUMNS.indexOf(a.column) - PLAN_COLUMNS.indexOf(b.column) ||
        a.order - b.order,
    )
    .map((d) => d.title);

  const launch = () =>
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
    );

  const add = (
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
  );

  const footer = editable && (
    <>
      {issueCount > 0 && (
        <ToneCallout tone="warning">{ts.review.issues(issueCount)}</ToneCallout>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={launch}
        >
          {pending ? t.launching : t.launch}
        </Button>
        {starting.length > 0 && (
          <p className="min-w-0 flex-1 text-caption text-[color:var(--text-secondary)]">
            {tj.starts(starting.join(", "))}
          </p>
        )}
      </div>
    </>
  );

  return (
    <SunkCard
      id="project-plan"
      title={title}
      meta={meta}
      actions={editable && add}
      footer={footer}
    >
      <PlanColumns
        cards={
          Object.fromEntries(
            PLAN_COLUMNS.map((column) => [
              column,
              inColumn(column).map((d, index, list) => {
                const step = asSteps.find((x) => x.key === d.key)!;
                const note = d.workflow === null && !d.added;
                const open = editing === d.key;
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
                    actions={
                      editable &&
                      !open && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={tj.modifyStep(d.title)}
                          onClick={() => setEditing(d.key)}
                        >
                          {fr.framingIntel.guide.modify}
                        </Button>
                      )
                    }
                    below={
                      open && (
                        <PlanRowEditor
                          title={d.title}
                          column={d.column}
                          ownerPersonId={d.ownerPersonId}
                          workflow={d.workflow}
                          values={valuesOf(d)}
                          withTitle={d.added}
                          members={members}
                          first={index === 0}
                          last={index === list.length - 1}
                          note={note}
                          onChange={(change) => update(d.key, change)}
                          onApply={(v) => apply(d.key, v)}
                          onMove={(offset) => move(d, offset)}
                          onRemove={() => {
                            update(d.key, { removed: true });
                            setEditing(null);
                          }}
                          onClose={() => setEditing(null)}
                        />
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
        <section
          aria-labelledby="plan-removed"
          className="flex flex-col gap-2 border-t border-[color:var(--border-hairline)] pt-3.5"
        >
          <h4 id="plan-removed" className="font-semibold">
            {t.removedTitle}
          </h4>
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
    </SunkCard>
  );
}
