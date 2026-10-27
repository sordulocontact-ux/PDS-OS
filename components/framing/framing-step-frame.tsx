import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
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
import { fr } from "@/lib/i18n/fr";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const t = fr.framingJourney;

/**
 * The frame of a Cadrage step (docs/VISION-UX.md § 4, proto « Projet
 * complet »): the module's head (« Projet › Cadrage › Étape », h1
 * « Cadrage », the project's facts), « Maintenant » for the person looking,
 * « Parcours · Cadrage » on the left, the open step on the right — grid
 * Exécute / Coordonne / Valide / Prérequis / Ensuite, then the step's
 * content. A locked step stays readable (StepPanel makes it inert).
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
  const { steps, viewerName } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  // Blockers and noted information of the step (sub-lot C6).
  const stepRef: StepRef = { projectId, module: "framing", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "framing", stepKey: s.key }),
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
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.module}
        shownKey={stepKey}
        labels={t.now}
      />
      <ModuleAttention
        stepRef={stepRef}
        modules={["framing"]}
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
