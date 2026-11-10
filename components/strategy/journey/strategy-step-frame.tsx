import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { strategyJourney } from "@/lib/i18n/fr/strategy-journey";
import type { StrategyStepKey } from "@/lib/strategy/journey";
import { strategyStepData } from "@/lib/strategy/step-data";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const fr = { strategyJourney };

const t = fr.strategyJourney;

/**
 * The frame of a Stratégie step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left, on its right the head (trail « Projet › Marketing ›
 * Stratégie › Étape », the Marketing's pills, h1 = the step's title, its
 * why, « Qui fait quoi ») then the step's content. A locked step stays
 * readable (StepPanel makes it inert).
 *
 * `page`: a page reached from the step without being one of its own (the
 * Plan de sortie, the Dossier de presse, the Suivi, under « Stratégie
 * validée »): the journey keeps the step open, the page's title and line
 * replace the step's, the arrow before the title leads back to the step,
 * and the trail ends « Step › Page ».
 */
export async function StrategyStepFrame({
  projectId,
  stepKey,
  page,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: StrategyStepKey;
  page?: { title: string; why?: string };
  children: React.ReactNode;
}) {
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { steps, validators, project } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  const stepRef: StepRef = { projectId, module: "strategy", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "strategy", stepKey: s.key }),
    label: s.title,
  }));
  const shown = page
    ? { ...step, title: page.title, why: page.why ?? "", due: null }
    : step;
  return (
    <JourneyLayout
      spine={<JourneySpine steps={steps} openKey={stepKey} />}
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={steps}
            head={shown}
            back={page ? { href: step.href, label: step.title } : undefined}
            extraCrumbs={
              page
                ? [
                    { label: step.title, href: step.href },
                    { label: page.title },
                  ]
                : undefined
            }
            actions={
              <WhoDoesWhatButton
                roles={[
                  {
                    key: "owner",
                    label: t.owner,
                    kind: "exec",
                    holder: project.ownerName
                      ? { name: project.ownerName }
                      : null,
                    what: t.roleWhat.owner,
                  },
                  ...validators.map((v) => ({
                    key: `validator-${v.personId}`,
                    label: v.role === "direction" ? t.direction : t.creative,
                    kind: "valid" as const,
                    holder: { name: v.name },
                    what:
                      v.role === "direction"
                        ? t.roleWhat.direction
                        : t.roleWhat.creative,
                  })),
                ]}
              />
            }
          />
          <ModuleAttention
            stepRef={stepRef}
            modules={["strategy"]}
            steps={choices}
          />
        </>
      }
    >
      <StepPanel step={shown} steps={steps} blockedLabel={t.blocked} {...slots}>
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
