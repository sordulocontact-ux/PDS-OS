import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { routes } from "@/lib/auth/redirects";
import { legalHistory } from "@/lib/i18n/fr/legal-history";
import { legalJourney } from "@/lib/i18n/fr/legal-journey";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { isLocked } from "@/lib/ui/journey";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const fr = { legalHistory, legalJourney, legalParticipations };

/**
 * The frame of a Juridique step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left (Dossier, Suivi with one step per démarche, Sortie),
 * on its right the head (h1 = the step's title, its why) and the step with
 * its slots (« Déjà fait » at the bottom). `stepKey`: a step of the
 * Dossier, a démarche (« person:<ref> ») or « ready ». When the viewer
 * acts, the whole content comes first as their gesture (StepPanel `lead`).
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
  const { steps, project } = await legalJourneyContext(projectId);
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
    <JourneyLayout
      spine={
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          footer={[
            {
              href: routes.projectLegalStep(projectId, "history"),
              label: fr.legalHistory.link,
            },
            // A collective: each participation's contract and deal (lot 11).
            ...(project.collective
              ? [
                  {
                    href: legalParticipationsHref(projectId),
                    label: fr.legalParticipations.link,
                  },
                ]
              : []),
          ]}
        />
      }
      head={
        <>
          <ProjectHeader projectId={projectId} steps={steps} head={step} />
          <ModuleAttention
            stepRef={stepRef}
            modules={["legal"]}
            steps={choices}
          />
        </>
      }
    >
      <StepPanel
        step={step}
        steps={steps}
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
    </JourneyLayout>
  );
}
