import { notFound } from "next/navigation";

import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import type { FramingStepKey } from "@/lib/framing/journey";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";

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
  const [ctx, journeys] = await Promise.all([
    framingJourneyContext(projectId),
    loadProjectJourneys(projectId),
  ]);
  if (!ctx) notFound();
  const { steps, viewerName } = ctx;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) notFound();
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={projectId} steps={steps} />
      <NowCard
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.module}
        shownKey={stepKey}
        elsewhere={elsewhereOf(journeys, steps)}
        labels={t.now}
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
          rootPrereq={fr.journey.meta.noPrereq}
          blockedLabel={t.blocked}
          {...slots}
        >
          {children}
        </StepPanel>
      </div>
    </div>
  );
}
