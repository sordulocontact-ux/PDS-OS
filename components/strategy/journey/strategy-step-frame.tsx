import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
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
import { fr } from "@/lib/i18n/fr";
import type { StrategyStepKey } from "@/lib/strategy/journey";
import { strategyStepData } from "@/lib/strategy/step-data";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const t = fr.strategyJourney;

/**
 * The frame of a Stratégie step (docs/VISION-UX.md § 4, proto « Projet
 * complet »): the module's head (« Projet › Marketing › Stratégie › Étape »,
 * the Marketing's pills, h1 « Stratégie », the project's facts, « Qui fait
 * quoi »), « Maintenant » for the person looking, « Parcours · Stratégie »
 * on the left, the open step on the right — grid Exécute / Coordonne /
 * Valide / Prérequis / Ensuite, then the step's content. A locked step stays
 * readable (StepPanel makes it inert).
 */
export async function StrategyStepFrame({
  projectId,
  stepKey,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: StrategyStepKey;
  children: React.ReactNode;
}) {
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { steps, viewerName, validators, project } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  const stepRef: StepRef = { projectId, module: "strategy", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "strategy", stepKey: s.key }),
    label: s.title,
  }));
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        steps={steps}
        actions={
          <WhoDoesWhatButton
            roles={[
              {
                key: "owner",
                label: t.owner,
                kind: "exec",
                holder: project.ownerName ? { name: project.ownerName } : null,
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
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={`${fr.shell.project.sidebar.marketing} › ${t.module}`}
        shownKey={stepKey}
        labels={t.now}
      />
      <ModuleAttention
        stepRef={stepRef}
        modules={["strategy"]}
        steps={choices}
      />
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
          {...slots}
        >
          <StepBlockers stepRef={stepRef} steps={choices} />
          {children}
          <StepToolsBlock
            stepRef={stepRef}
            steps={choices}
            locked={step.status === "blocked"}
          />
        </StepPanel>
      </div>
    </div>
  );
}
