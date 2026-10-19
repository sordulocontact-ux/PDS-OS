import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { legalJourneyContext } from "@/lib/legal/journey-context";

/**
 * The frame of a Juridique step (docs/VISION-UX.md § 4, proto « Projet
 * complet »): « Maintenant » for the person looking, the journey on the
 * left (Dossier, Suivi with one step per démarche, Sortie), the open step
 * on the right with its slots (« Déjà fait » at the bottom). `stepKey`: a
 * step of the Dossier, a démarche (« person:<ref> ») or « ready ».
 */
export async function LegalStepFrame({
  projectId,
  stepKey,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: string;
  children: React.ReactNode;
}) {
  const [{ steps, viewerName }, journeys] = await Promise.all([
    legalJourneyContext(projectId),
    loadProjectJourneys(projectId),
  ]);
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={projectId} steps={steps} />
      <NowCard
        steps={steps}
        viewerName={viewerName}
        moduleLabel={fr.shell.project.sidebar.legal}
        shownKey={stepKey}
        elsewhere={elsewhereOf(journeys, steps)}
        labels={{
          waitingTitle: fr.legalDemarches.nowWaiting,
          finished: fr.journey.now.finished,
        }}
      />
      <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          footer={{
            href: routes.projectLegalStep(projectId, "history"),
            label: fr.legalHistory.link,
          }}
        />
        <StepPanel
          step={step}
          steps={steps}
          rootPrereq={fr.legalJourney.rootPrereq}
          blockedLabel={fr.legalJourney.blocked}
          {...slots}
        >
          {children}
        </StepPanel>
      </div>
    </div>
  );
}
