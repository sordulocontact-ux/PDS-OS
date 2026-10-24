import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { NowCard } from "@/components/shell/journey/now-card";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { isLocked } from "@/lib/ui/journey";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

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
  // The viewer's gesture comes first (« À vous », JUR-08): the step's content
  // is its lead, the grid folded under it (StepPanel), unless the page gives
  // its own lead.
  const asLead =
    slots.lead === undefined &&
    Boolean(step.actor?.viewer) &&
    !isLocked(step.status);
  // Blockers and noted information of the step (sub-lot C6).
  const stepRef: StepRef = { projectId, module: "legal", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "legal", stepKey: s.key }),
    label: s.title,
  }));
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
      <ModuleAttention stepRef={stepRef} modules={["legal"]} steps={choices} />
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
          {...(asLead && { lead: children })}
        >
          <StepBlockers stepRef={stepRef} steps={choices} />
          {!asLead && children}
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
