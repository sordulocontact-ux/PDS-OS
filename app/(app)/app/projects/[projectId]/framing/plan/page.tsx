import { notFound } from "next/navigation";

import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { LaunchWorkflowButton } from "@/components/plan/launch-workflow-button";
import { BriefDrift } from "@/components/plan/brief-drift";
import { PlanBoard } from "@/components/plan/plan-board";
import { PlanColumns } from "@/components/plan/plan-columns";
import { PlanStepCard } from "@/components/plan/plan-step-card";
import { PlanStepsSection } from "@/components/plan/plan-steps-section";
import { Fold } from "@/components/ui/fold";
import { SunkCard } from "@/components/ui/sunk-card";
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
import { stepStatus } from "@/lib/plan/steps";
import { formatShortInstant } from "@/lib/utils/day";
import { loadWorkflowStates } from "@/lib/workflow-status/load";
import { applicableWorkflows } from "@/lib/workflow-status/rules";

/**
 * Cadrage › Plan du projet (proto « Suite du Cadrage », Sacha 29/10/2026;
 * ticket § 9): PO's proposal in one card, its source said in its head —
 * Focus, Ensuite, Pendant ce temps, À anticiper, one row per workflow — the
 * owner opens a row to change it and « Lancer le plan » starts every
 * workflow, said under it before the gesture. Launched, the same card says
 * who launched it and each row its real state; the steps' table and
 * history stay folded.
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
  const briefVersion =
    k.briefs.find((b) => b.state === "approved")?.version ?? null;

  let body: React.ReactNode = null;
  if (validated && flows && !plan)
    body = (
      <PlanBoard
        projectId={projectId}
        items={proposePlan(k)}
        members={k.framing.members}
        editable={canEdit}
        title={t.title}
        meta={t.proposedFrom(briefVersion)}
        context={{
          states: flows.states,
          targetDate: target,
        }}
      />
    );
  else if (plan && flows) {
    // Stratégie, Master, Juridique left out of the plan wait until added
    // (« Ajouter et lancer »); the others open with the plan. Only those
    // the project has: no Master without a title (recette 19/10).
    const applies = applicableWorkflows({
      type: project.type,
      masterCount: project.masters.length,
      collective: project.collective,
    });
    const absent = (["strategy", "master", "legal"] as const).filter(
      (w) =>
        (w !== "master" || applies.includes("master")) &&
        !plan.items.some((i) => i.workflow === w),
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
        <SunkCard
          id="project-plan"
          title={t.title}
          meta={t.launchedMeta(
            plan.launchedByName,
            formatShortInstant(plan.launchedAt),
          )}
        >
          <PlanColumns cards={cards} targetDate={target} />
        </SunkCard>
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
