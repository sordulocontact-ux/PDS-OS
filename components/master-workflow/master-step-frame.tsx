import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import {
  masterJourneyContext,
  masterTitleJourney,
} from "@/lib/master-workflow/journey-context";
import { masterRoles } from "@/lib/master-workflow/roles";
import {
  titleCrumb,
  type MasterTitleScope,
} from "@/lib/master-workflow/title-scope";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { projectHeaderData } from "@/lib/projects/header";
import type { ModuleFact } from "@/lib/ui/module-frame";
import type { MasterStepKey } from "@/lib/ui/master-steps";
import { loadRelease, PROJECT_RELEASE } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

const fr = { masterJourney, moduleFrame };

const t = fr.masterJourney;

/**
 * The Master's facts under its title: the master final's date, then the
 * release — never « projet · artiste », which the project's bar already
 * names (docs/DESIGN.md, « En-tête de module », point 4). A collective's
 * title: its own release, not the project's due date (Sacha, 27/11/2026:
 * « Assurance 30 · PDS », « Échéance du projet » on the Source of « Marée
 * haute »); the title is named by the trail.
 */
export async function masterFacts(
  projectId: string,
  titleScope: MasterTitleScope | null = null,
): Promise<ModuleFact[]> {
  const [data, { facts }, titleRelease] = await Promise.all([
    projectHeaderData(projectId),
    masterJourneyContext(projectId),
    titleScope ? loadTitleRelease(projectId, titleScope) : null,
  ]);
  const due = facts.brief?.masterFinalDue;
  const release = titleScope
    ? titleRelease
      ? [
          {
            key: "release",
            label: fr.moduleFrame.facts.release,
            value: formatDay(titleRelease),
          },
        ]
      : []
    : (data?.facts ?? []).filter((f) => f.key === "release");
  return [
    ...(due
      ? [
          {
            key: "master-final",
            label: t.facts.masterFinal,
            value: formatDay(due),
          },
        ]
      : []),
    ...release,
  ];
}

/** A collective's title's release date, else its compilation's. */
async function loadTitleRelease(
  projectId: string,
  scope: MasterTitleScope,
): Promise<string | null> {
  const supabase = await createClient();
  try {
    const [own, compilation] = await Promise.all([
      loadRelease(supabase, projectId, {
        kind: "title",
        titleId: scope.active.titleId,
      }),
      loadRelease(supabase, projectId, PROJECT_RELEASE),
    ]);
    return (
      own?.planned_release_date ?? compilation?.planned_release_date ?? null
    );
  } catch (error) {
    // A fact of the head never takes the page down.
    console.error("masterFacts release:", error);
    return null;
  }
}

/**
 * The frame of a Master step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left with « Historique du master » at its foot, on its
 * right the head (h1 = the step's title, its why, « Qui fait quoi », the
 * Master's facts) then the step's content. A collective's titles are
 * listed at the Master's entry (MasterTitlesPage), not under each step.
 */
export async function MasterStepFrame({
  projectId,
  stepKey,
  children,
  slots,
  titleScope = null,
}: {
  projectId: string;
  stepKey: MasterStepKey;
  children: React.ReactNode;
  slots?: Omit<React.ComponentProps<typeof StepPanel>, "step" | "steps">;
  // A collective (lot 8): the title the page shows, named in the trail
  // (Master ▸ titre ▸ étape) with its siblings, kept from step to step.
  titleScope?: MasterTitleScope | null;
}) {
  const {
    steps: own,
    facts: rows,
    project,
  } = await masterJourneyContext(projectId);
  // A collective: the journey of the title shown, its states its own
  // (Maël 23/11/2026, « 1 par son »), each step keeping the title.
  const steps = titleScope
    ? await masterTitleJourney(projectId, titleScope.active.masterId)
    : own;
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const titled = titleScope
    ? steps.map((s) => ({
        ...s,
        href: `${s.href}?titre=${titleScope.active.masterId}`,
        actor: s.actor?.href
          ? { ...s.actor, href: keepTitre(s.actor.href, titleScope) }
          : s.actor,
      }))
    : steps;
  // Blockers and noted information of the step (C6).
  const stepRef: StepRef = { projectId, module: "master", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "master", stepKey: s.key }),
    label: s.title,
  }));
  const roles = masterRoles(rows, project.ownerName);
  return (
    <JourneyLayout
      spine={<JourneySpine steps={titled} openKey={stepKey} />}
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={titled}
            head={step}
            extraCrumbs={
              titleScope
                ? [titleCrumb(projectId, stepKey, titleScope)]
                : undefined
            }
            facts={masterFacts(projectId, titleScope)}
            actions={
              <WhoDoesWhatButton
                {...roles}
                personLinks={
                  <ContactLinksSection
                    projectId={projectId}
                    sub={(roles.links?.length ?? 0) > 0}
                  />
                }
              />
            }
          />
          <ModuleAttention
            stepRef={stepRef}
            modules={["master"]}
            steps={choices}
          />
        </>
      }
    >
      <StepPanel step={step} steps={titled} blockedLabel={t.blocked} {...slots}>
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

/** An action's link keeping the title shown, before any anchor. */
function keepTitre(href: string, scope: MasterTitleScope): string {
  const hash = href.indexOf("#");
  const path = hash >= 0 ? href.slice(0, hash) : href;
  const anchor = hash >= 0 ? href.slice(hash) : "";
  return `${path}${path.includes("?") ? "&" : "?"}titre=${scope.active.masterId}${anchor}`;
}
