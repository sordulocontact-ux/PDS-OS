import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import type { FramingStepKey } from "@/lib/framing/journey";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const fr = { framingJourney };

const t = fr.framingJourney;

/**
 * The frame of a Cadrage step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left, on its right the head (trail « Projet › Cadrage ›
 * Étape » in the top bar, h1 = the step's title, its why, « Qui fait
 * quoi ») then the step's content. A locked step stays readable (StepPanel
 * makes it inert).
 */
export async function FramingStepFrame({
  projectId,
  stepKey,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: FramingStepKey;
  children: React.ReactNode;
}) {
  const ctx = await framingJourneyContext(projectId);
  if (!ctx) notFound();
  const { steps } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  // Blockers and noted information of the step (sub-lot C6).
  const stepRef: StepRef = { projectId, module: "framing", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "framing", stepKey: s.key }),
    label: s.title,
  }));
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
              <WhoDoesWhatButton
                roles={[
                  {
                    key: "owner",
                    label: t.owner,
                    kind: "exec",
                    holder: ctx.project.ownerName
                      ? { name: ctx.project.ownerName }
                      : null,
                    what: t.roleWhat.owner,
                  },
                  {
                    key: "validator",
                    label: t.validatorRole,
                    kind: "valid",
                    holder: ctx.validator ? { name: ctx.validator.name } : null,
                    what: t.roleWhat.validator,
                  },
                ]}
              />
            }
          />
          <ModuleAttention
            stepRef={stepRef}
            modules={["framing"]}
            steps={choices}
          />
        </>
      }
    >
      <StepPanel step={step} steps={steps} blockedLabel={t.blocked} {...slots}>
        <StepBlockers stepRef={stepRef} steps={choices} />
        {children}
        <StepToolsBlock
          stepRef={stepRef}
          steps={choices}
          locked={step.status === "blocked"}
        />
      </StepPanel>
    </JourneyLayout>
  );
}
