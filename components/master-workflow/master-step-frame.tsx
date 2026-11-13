import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { StepHistory } from "@/components/shell/journey/step-history";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { TitlesOverview } from "@/components/master-workflow/titles-overview";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { masterHistory } from "@/lib/master-workflow/history";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { masterRoles } from "@/lib/master-workflow/roles";
import {
  titleCrumb,
  type MasterTitleScope,
} from "@/lib/master-workflow/title-scope";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { projectHeaderData } from "@/lib/projects/header";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { masterStepHref, type MasterStepKey } from "@/lib/ui/master-steps";
import { formatDay } from "@/lib/utils/day";

const fr = { masterJourney };

const t = fr.masterJourney;

/** The Master's facts under its title (proto): the project, the master
 * final's date, the release. */
export async function masterFacts(projectId: string): Promise<ModuleFact[]> {
  const [data, { facts }] = await Promise.all([
    projectHeaderData(projectId),
    masterJourneyContext(projectId),
  ]);
  const own = data?.facts ?? [];
  const due = facts.brief?.masterFinalDue;
  return [
    ...own.filter((f) => f.key === "project"),
    ...(due
      ? [
          {
            key: "master-final",
            label: t.facts.masterFinal,
            value: formatDay(due),
          },
        ]
      : []),
    ...own.filter((f) => f.key === "release"),
  ];
}

/**
 * The frame of a Master step (docs/VISION-UX.md § 4, JourneyLayout): the
 * journey on the left with « Historique du master » at its foot, on its
 * right the head (h1 = the step's title, its why, « Qui fait quoi », the
 * Master's facts) then the step's content and « Déjà fait ».
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
  const { steps, facts: rows, project } = await masterJourneyContext(projectId);
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const titled = titleScope
    ? steps.map((s) => ({
        ...s,
        href: `${s.href}?titre=${titleScope.active.masterId}`,
      }))
    : steps;
  // Blockers and noted information of the step (C6).
  const stepRef: StepRef = { projectId, module: "master", stepKey };
  const choices = steps.map((s) => ({
    key: stepChoiceKey({ module: "master", stepKey: s.key }),
    label: s.title,
  }));
  const history = masterHistory(rows)
    .filter((item) => item.step === stepKey)
    .reverse();
  const roles = masterRoles(rows, project.ownerName);
  return (
    <JourneyLayout
      spine={
        <JourneySpine
          steps={titled}
          openKey={stepKey}
          footer={{
            href: masterStepHref(projectId, "history"),
            label: t.history.link,
          }}
        />
      }
      head={
        <>
          <ProjectHeader
            projectId={projectId}
            steps={steps}
            head={step}
            extraCrumbs={
              titleScope
                ? [titleCrumb(projectId, stepKey, titleScope)]
                : undefined
            }
            facts={masterFacts(projectId)}
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
          {/* A collective: where its titles stand, at a glance (lot 9). */}
          {titleScope && (
            <TitlesOverview projectId={projectId} scope={titleScope} />
          )}
        </>
      }
    >
      <StepPanel
        step={step}
        steps={titled}
        blockedLabel={t.blocked}
        history={<StepHistory items={history} />}
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
    </JourneyLayout>
  );
}
