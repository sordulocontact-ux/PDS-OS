import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import { StepHistory } from "@/components/shell/journey/step-history";
import { StepPanel } from "@/components/shell/journey/step-panel";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { masterHistory } from "@/lib/master-workflow/history";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
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
  const [{ steps, viewerName, facts: rows }, journeys, facts] =
    await Promise.all([
      masterJourneyContext(projectId),
      loadProjectJourneys(projectId),
      masterFacts(projectId),
    ]);
  const step = steps.find((s) => s.key === stepKey);
  if (!step) return null;
  const history = masterHistory(rows)
    .filter((item) => item.step === stepKey)
    .reverse();
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader projectId={projectId} steps={steps} facts={facts} />
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
          {children}
        </StepPanel>
      </div>
    </div>
  );
}
