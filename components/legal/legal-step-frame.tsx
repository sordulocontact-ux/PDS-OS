import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import {
  StepPanel,
  type StepSlots,
} from "@/components/shell/journey/step-panel";
import { legalJourney } from "@/lib/i18n/fr/legal-journey";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import {
  scopeEntry,
  scopeOfStep,
  type LegalScope,
  type TitleLayout,
} from "@/lib/legal/title-groups";
import { legalTitleLayout } from "@/lib/legal/title-layout";
import type { CrumbOption } from "@/lib/ui/module-frame";
import { isLocked } from "@/lib/ui/journey";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";

const fr = { legalJourney, legalParticipations };

/**
 * The frame of a Juridique step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left (Dossier, Suivi with one step per démarche, Sortie),
 * on its right the head (h1 = the step's title, its why) and the step with
 * its slots (« Déjà fait » at the bottom). `stepKey`: a step of the
 * Dossier, a démarche (« person:<ref> ») or « ready ». When the viewer
 * acts, the whole content comes first as their gesture (StepPanel `lead`).
 *
 * A collective (retour d'Ibé du 18/11/2026; Maël 23/11/2026, « 1 par
 * son »): one journey at a time (lib/legal/title-layout.ts), « Projet » or
 * a title, chosen in the trail (Juridique ▸ Néons ▸ step) as the Master
 * does; `titre` keeps the title of a step two titles share (a guest of
 * both). A title's step names its title in a tag before its h1 (the hue of
 * its tags in the État des lieux) and no longer repeats it in its own
 * title. A step of the spine only (« Rattacher le titre au Catalogue »,
 * `attach:<id>`) has no tools: nothing to report or note on it.
 * « Participations et contrats » is a button of the head, on every step of
 * a collective's Juridique.
 */
export async function LegalStepFrame({
  projectId,
  stepKey,
  titre = null,
  children,
  ...slots
}: StepSlots & {
  projectId: string;
  stepKey: string;
  titre?: string | null;
  children: React.ReactNode;
}) {
  const { steps, project } = await legalJourneyContext(projectId);
  const layout = project.collective ? await legalTitleLayout(projectId) : null;
  const scope = layout ? scopeOfStep(layout, stepKey, titre) : null;
  const spine = scope?.steps ?? steps;
  // The step as the spine shows it (in a title's group: without the
  // title's name); `own`, the journey's, which the tools and Travail know.
  const step = spine.find((s) => s.key === stepKey);
  if (!step) return null;
  const own = steps.find((s) => s.key === stepKey);
  const title = scope?.titleId ? scope : null;
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
      spine={<JourneySpine steps={spine} openKey={stepKey} />}
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={spine}
            head={step}
            media={
              title ? (
                // Narrow on a phone: the h1 keeps the width of the line.
                <StatusBadge
                  tone={title.hue ?? "neutral"}
                  title={title.heading}
                  className="max-w-36 shrink-0 truncate sm:max-w-64"
                >
                  {title.heading}
                </StatusBadge>
              ) : undefined
            }
            extraCrumbs={
              layout && scope ? [scopeCrumb(layout, scope)] : undefined
            }
            // A collective (Ibé and Maël did not find it at the foot of the
            // spine, 21/11/2026): each participation's contract and deal
            // (lot 11), on every page of its Juridique. The frame is only
            // read with manage_legal (legalJourneyContext: 404 otherwise).
            actions={
              project.collective ? (
                <ViewLink
                  href={legalParticipationsHref(projectId)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ButtonRoll>{fr.legalParticipations.link}</ButtonRoll>
                </ViewLink>
              ) : undefined
            }
          />
          {own && (
            <ModuleAttention
              stepRef={stepRef}
              modules={["legal"]}
              steps={choices}
            />
          )}
        </>
      }
    >
      <StepPanel
        step={own ?? step}
        steps={own ? steps : spine}
        blockedLabel={fr.legalJourney.blocked}
        {...slots}
        {...(asLead && { lead: children })}
      >
        {own && <StepBlockers stepRef={stepRef} steps={choices} />}
        {!asLead && children}
        {own && (
          <StepToolsBlock
            stepRef={stepRef}
            steps={choices}
            locked={isLocked(step.status)}
          />
        )}
      </StepPanel>
    </JourneyLayout>
  );
}

/** The journey shown, in the trail, with the others to choose from
 * (« Projet », then each title): each opens where it waits for the viewer;
 * done when all its steps are, the viewer's steps counted. */
function scopeCrumb(
  layout: TitleLayout,
  scope: LegalScope,
): { label: string; options?: CrumbOption[] } {
  if (layout.scopes.length < 2) return { label: scope.label };
  return {
    label: scope.label,
    options: layout.scopes.flatMap((s) => {
      const entry = scopeEntry(s);
      if (!entry) return [];
      const mine = s.steps.filter((step) => step.actor?.viewer).length;
      return [
        {
          key: s.key,
          label: s.label,
          href: entry.href,
          current: s.key === scope.key,
          done: s.steps.every((step) => step.status === "done"),
          ...(mine > 0 && { mine }),
        },
      ];
    }),
  };
}
