import { notFound } from "next/navigation";

import { DesignWhoDoesWhatButton } from "@/components/design/roles/design-roles";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { StepHistory } from "@/components/shell/journey/step-history";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { designJourneyContext } from "@/lib/design/journey-context";
import type { DesignStepKey } from "@/lib/design/journey";
import { designJourney } from "@/lib/i18n/fr/design-journey";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import { journey } from "@/lib/i18n/fr/journey";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { isLocked } from "@/lib/ui/journey";

const fr = { journey, designJourney, designSteps };

const t = fr.designJourney;

/**
 * The frame of a Conception step (docs/VISION-UX.md § 4, proto « Projet
 * complet »): the Marketing's head (« Projet › Marketing › Conception ›
 * Étape », its pills, h1 « Conception », « Qui fait quoi »), « Maintenant »
 * for the person looking, « Parcours · Conception » on the left, the open
 * step on the right — its why, then the step's content and its tools. A locked step stays
 * readable (StepPanel makes it inert).
 */
export async function DesignStepFrame({
  projectId,
  stepKey,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: DesignStepKey;
  children: React.ReactNode;
}) {
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const { steps, viewerName, people, data } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  const stepRef: StepRef = { projectId, module: "design", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "design", stepKey: s.key }),
    label: s.title,
  }));
  const history =
    stepKey !== "direction"
      ? []
      : [...ctx.direction.submissions]
          .filter((s) => s.status !== "withdrawn")
          .reverse()
          .flatMap((s) => [
            {
              key: `${s.id}-s`,
              text: fr.designSteps.direction.history.submitted(s.number),
              who: s.submittedByName,
              at: s.submittedAt,
            },
            ...s.decisions.map((d) => ({
              key: d.id,
              text:
                (d.decision === "approved"
                  ? fr.designSteps.direction.history.approved
                  : d.decision === "rejected"
                    ? fr.designSteps.direction.history.refused
                    : fr.designSteps.direction.history.changes) +
                (d.comment
                  ? fr.designSteps.sheets.history.comment(d.comment)
                  : ""),
              who: d.decidedByName,
              at: d.decidedAt,
            })),
          ]);
  const open = data.stage?.state === "in_progress";
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        steps={steps}
        actions={
          <DesignWhoDoesWhatButton
            projectId={projectId}
            scope="direction"
            sheetId={null}
            people={people.direction}
            ownerName={ctx.project.ownerName}
            members={people.members}
            suggestions={people.suggestions}
            canAssign={ctx.isOwner && open}
            canEditValidators={ctx.isOwner && open}
            responsibleLabel={t.roles.creative}
            personLinks={<ContactLinksSection projectId={projectId} />}
          />
        }
      />
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.module}
        shownKey={stepKey}
        labels={t.now}
      />
      <ModuleAttention stepRef={stepRef} modules={["design"]} steps={choices} />
      <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          title={fr.journey.titleOf(t.module)}
        />
        <StepPanel
          step={step}
          steps={steps}
          blockedLabel={t.blocked}
          history={<StepHistory items={history} />}
          {...slots}
        >
          <StepBlockers stepRef={stepRef} steps={choices} />
          {children}
          <StepToolsBlock
            stepRef={stepRef}
            steps={choices}
            locked={isLocked(step.status)}
          />
        </StepPanel>
      </div>
    </div>
  );
}
