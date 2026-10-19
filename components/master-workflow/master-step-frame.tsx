import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import { StepHistory } from "@/components/shell/journey/step-history";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import {
  StepBlockers,
  StepToolsBlock,
} from "@/components/shell/module/step-tools-block";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { masterHistory } from "@/lib/master-workflow/history";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { masterRoles } from "@/lib/master-workflow/roles";
import { stepChoiceKey, type StepRef } from "@/lib/step-tools/model";
import { projectHeaderData } from "@/lib/projects/header";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { masterStepHref, type MasterStepKey } from "@/lib/ui/master-steps";
import { formatDay } from "@/lib/utils/day";

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
 * The frame of a Master step (docs/VISION-UX.md § 4, proto `master-v2.html`):
 * the module's head with its facts, « Maintenant » for the person looking,
 * the journey on the left with « Historique du master » at its foot, the
 * open step on the right — its grid, its content, then « Déjà fait ».
 */
export async function MasterStepFrame({
  projectId,
  stepKey,
  children,
  slots,
}: {
  projectId: string;
  stepKey: MasterStepKey;
  children: React.ReactNode;
  slots?: Omit<React.ComponentProps<typeof StepPanel>, "step" | "steps">;
}) {
  const [{ steps, viewerName, facts: rows, project }, journeys, facts] =
    await Promise.all([
      masterJourneyContext(projectId),
      loadProjectJourneys(projectId),
      masterFacts(projectId),
    ]);
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
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
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        steps={steps}
        facts={facts}
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
      <NowCard
        steps={steps}
        viewerName={viewerName}
        moduleLabel={t.module}
        shownKey={stepKey}
        elsewhere={elsewhereOf(journeys, steps)}
        labels={t.now}
      />
      <ModuleAttention stepRef={stepRef} modules={["master"]} steps={choices} />
      <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
        <JourneySpine
          steps={steps}
          openKey={stepKey}
          footer={{
            href: masterStepHref(projectId, "history"),
            label: t.history.link,
          }}
        />
        <StepPanel
          step={step}
          steps={steps}
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
      </div>
    </div>
  );
}
