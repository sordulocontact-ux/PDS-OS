import { notFound } from "next/navigation";

import { DesignWhoDoesWhatButton } from "@/components/design/roles/design-roles";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
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
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { isLocked } from "@/lib/ui/journey";

const fr = { designJourney, designSteps };

const t = fr.designJourney;

/**
 * The frame of a Conception step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left, on its right the Marketing's head (trail « Projet ›
 * Marketing › Conception › Étape », its pills, h1 = the step's title, its
 * why, « Qui fait quoi ») then the step's content and its tools. A locked
 * step stays readable (StepPanel makes it inert).
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
  const { steps, people, data } = ctx;
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
    <JourneyLayout
      spine={<JourneySpine steps={steps} openKey={stepKey} />}
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={steps}
            head={step}
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
          <ModuleAttention
            stepRef={stepRef}
            modules={["design"]}
            steps={choices}
          />
        </>
      }
    >
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
    </JourneyLayout>
  );
}
