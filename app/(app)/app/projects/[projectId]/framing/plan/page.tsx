import { notFound } from "next/navigation";

import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { LaunchWorkflowButton } from "@/components/plan/launch-workflow-button";
import { BriefDrift } from "@/components/plan/brief-drift";
import { PlanBoard } from "@/components/plan/plan-board";
import { PlanColumns } from "@/components/plan/plan-columns";
import { PlanStepCard } from "@/components/plan/plan-step-card";
import { PlanStepsSection } from "@/components/plan/plan-steps-section";
import { Fold } from "@/components/ui/fold";
import { PoCallout } from "@/components/ui/po-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { briefDrift } from "@/lib/framing/brief-drift";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { fr } from "@/lib/i18n/fr";
import {
  MARKETING_PARTS,
  PLAN_COLUMNS,
  proposePlan,
  type PlanColumn,
} from "@/lib/plan/propose";
import { loadLaunchedPlan } from "@/lib/plan/queries";
import { stepStatus, workflowsToReview } from "@/lib/plan/steps";
import { formatShortInstant } from "@/lib/utils/day";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

/**
 * Cadrage › Plan du projet (proto frPlanView, ticket § 9): PO proposes the
 * organisation from the validated Brief — Focus, Ensuite, Pendant ce temps,
 * À anticiper, one card per workflow — the owner changes it (column and
 * pilot in place, the rest in each step's form) and « Lancer le plan »
 * starts every workflow. Launched, the plan stays here, readable, with its
 * steps and history folded.
 */
export default async function FramingPlanPage({
  params,
}: PageProps<"/app/projects/[projectId]/framing/plan">) {
  const { projectId } = await params;
  const ctx = await framingJourneyContext(projectId);
  if (!ctx) notFound();
  const { k, stage, canEdit, project } = ctx;
  const t = fr.framingJourney.plan;
  const validated = stage === "validated";
  const [plan, flows] = validated
    ? await Promise.all([
        loadLaunchedPlan(projectId),
        loadWorkflowStates(projectId),
      ])
    : [null, null];
  const drift = validated ? briefDrift(k) : [];
  const targetRow = k.framing.briefRows.find(
    (r) => r.field_key === "target_date" && r.status === "confirmed",
  );
  const target = typeof targetRow?.value === "string" ? targetRow.value : null;

  let body: React.ReactNode = null;
  if (validated && flows && !plan)
    body = (
      <>
        <PoCallout>{t.po}</PoCallout>
        <PlanBoard
          projectId={projectId}
          items={proposePlan(k)}
          members={k.framing.members}
          editable={canEdit}
          context={{
            states: flows.states,
            targetDate: target,
            review: Object.fromEntries(workflowsToReview(drift)),
            dependencies: flows.dependencies,
          }}
        />
        {!canEdit && (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.waiting(project.ownerName ?? "—")}
          </p>
        )}
      </>
    );
  else if (plan && flows) {
    // Stratégie, Master, Juridique left out of the plan wait until added
    // (« Ajouter et lancer »); the others open with the plan.
    const absent = (["strategy", "master", "legal"] as const).filter(
      (w) => !plan.items.some((i) => i.workflow === w),
    );
    const group = (w: string | null) =>
      w && (MARKETING_PARTS as readonly string[]).includes(w) ? t.group : null;
    const cards = Object.fromEntries(
      PLAN_COLUMNS.map((column) => [
        column,
        plan.items
          .filter((i) => i.column === column)
          .map((i) => (
            <PlanStepCard
              key={i.id}
              stepKey={i.id}
              title={i.title}
              group={group(i.workflow)}
              why={i.why}
              specialized={null}
              status={stepStatus(i, flows.states)}
              pilot={i.ownerName}
              dueDate={i.dueDate}
              issues={[]}
              muted={i.workflow === null && i.column === "anticipate"}
              actions={
                // A workflow a plan launched before « Lancer le plan »
                // started them all, still waiting (« Lancer maintenant »).
                canEdit &&
                i.workflow &&
                !i.launchedAt && (
                  <LaunchWorkflowButton
                    projectId={projectId}
                    workflow={i.workflow}
                    pilot={i.ownerName}
                  />
                )
              }
            />
          )),
      ]),
    ) as Record<PlanColumn, React.ReactNode[]>;
    body = (
      <>
        <ToneCallout tone="success">
          <span>
            <b>{t.launchedStrong}</b>{" "}
            {t.launched(
              plan.launchedByName,
              formatShortInstant(plan.launchedAt),
            )}
          </span>
        </ToneCallout>
        <PlanColumns cards={cards} />
        {absent.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-body-md font-semibold">
              {fr.framingIntel.plan.absentTitle}
            </h3>
            <p className="text-caption text-[color:var(--text-secondary)]">
              {canEdit
                ? fr.framingIntel.plan.absentHint
                : fr.framingIntel.plan.absentReadOnly}
            </p>
            <ul className="flex flex-wrap gap-3">
              {absent.map((w) => (
                <li key={w} className="flex items-center gap-2 text-body-md">
                  {fr.framingIntel.plan.workflows[w]}
                  {canEdit && (
                    <LaunchWorkflowButton
                      projectId={projectId}
                      workflow={w}
                      pilot={project.ownerName}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Fold summary={t.stepsTitle}>
          <PlanStepsSection
            projectId={projectId}
            plan={plan}
            flows={flows}
            drift={drift}
            targetDate={target}
            members={k.framing.members}
            editable={canEdit}
          />
        </Fold>
      </>
    );
  }

  return (
    <FramingStepFrame projectId={projectId} stepKey="plan">
      <div className="flex flex-col gap-4">
        {validated && <BriefDrift projectId={projectId} changes={drift} />}
        {body}
      </div>
    </FramingStepFrame>
  );
}
