import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { routes } from "@/lib/auth/redirects";
import { journey } from "@/lib/i18n/fr/journey";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalHistory } from "@/lib/i18n/fr/legal-history";
import { legalJourney } from "@/lib/i18n/fr/legal-journey";
import { shell } from "@/lib/i18n/fr/shell";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { isLocked } from "@/lib/ui/journey";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const fr = { shell, journey, legalDemarches, legalHistory, legalJourney };

/**
 * The frame of a Juridique step (docs/VISION-UX.md § 4, proto « Projet
 * complet »): « Maintenant » for the person looking, the journey on the
 * left (Dossier, Suivi with one step per démarche, Sortie), the open step
 * on the right with its slots (« Déjà fait » at the bottom). `stepKey`: a
 * step of the Dossier, a démarche (« person:<ref> ») or « ready ».
 * When the viewer acts, the whole content comes first as their gesture:
 * no « À vous · … » line above it, which would only repeat the journey
 * and the gesture's own section and button (Sacha, 06/11/2026).
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
  const { steps, viewerName } = await legalJourneyContext(projectId);
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
      <ProjectNowCard
        projectId={projectId}
        steps={steps}
        viewerName={viewerName}
        moduleLabel={fr.shell.project.sidebar.legal}
        shownKey={stepKey}
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
          blockedLabel={fr.legalJourney.blocked}
          leadTitle={!asLead}
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
