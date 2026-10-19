import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import { distributionStatus } from "@/lib/distribution/journey";
import {
  distributionContext,
  type DistributionContext,
} from "@/lib/distribution/journey-context";
import { isOpen } from "@/lib/distribution/anomalies";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { projectFormatLabel } from "@/lib/projects/labels";
import { getProject } from "@/lib/projects/queries";
import { distributionViewHref } from "@/lib/ui/distribution-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const t = fr.distributionJourney;

/** « « Néons » · Mona Lys · single », Master final, Sortie, Distributeur. */
function factsOf(ctx: DistributionContext): ModuleFact[] {
  const { project, dates } = ctx;
  const format = projectFormatLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  return [
    {
      key: "project",
      value: [`« ${project.title} »`, project.artistName, format?.toLowerCase()]
        .filter(Boolean)
        .join(" · "),
    },
    ...(dates.masterFinal
      ? [
          {
            key: "master",
            label: t.facts.masterFinal,
            value: formatDay(dates.masterFinal.date),
          },
        ]
      : []),
    ...(dates.release
      ? [
          {
            key: "release",
            label: t.facts.release,
            value: formatDay(dates.release.date),
          },
        ]
      : []),
    { key: "distributor", label: t.facts.distributor, value: t.distributor },
  ];
}

/**
 * The frame of every Distribution page (docs/VISION-UX.md § 4, proto
 * « Projet complet »): the head (« Distribution », its state, its facts),
 * « Maintenant » for the person looking, then the journey on the left and
 * the open step on the right — or, for the two views of the journey's foot
 * (Anomalies, Historique), the view in full width. Before the plan is
 * launched, the module's lock leads to the plan.
 */
export async function DistributionFrame({
  projectId,
  shownKey,
  children,
}: {
  projectId: string;
  // The step shown on the right; none for a view.
  shownKey?: string;
  children: (ctx: DistributionContext) => React.ReactNode;
}) {
  const [ctx, journeys] = await Promise.all([
    distributionContext(projectId),
    loadProjectJourneys(projectId),
  ]);
  if (!ctx) {
    const project = await getProject(projectId);
    return (
      <WorkflowLocked
        projectId={projectId}
        name={t.module}
        framingValidated={
          project?.stages.some(
            (s) => s.key === "framing" && s.state === "validated",
          ) ?? false
        }
        waiting={false}
        absent={false}
      />
    );
  }
  const status = distributionStatus(ctx.steps);
  const open = ctx.anomalies.filter(isOpen).length;
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        title={t.module}
        status={{ label: t.status[status], tone: workflowStatusTone[status] }}
        facts={factsOf(ctx)}
        steps={ctx.steps}
      />
      <NowCard
        steps={ctx.steps}
        viewerName={ctx.viewerName}
        moduleLabel={t.module}
        shownKey={shownKey}
        elsewhere={elsewhereOf(journeys, ctx.steps)}
        labels={{ waitingTitle: t.now.waitingTitle, finished: t.now.finished }}
      />
      {shownKey ? (
        <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
          <JourneySpine
            steps={ctx.steps}
            openKey={shownKey}
            footer={[
              {
                href: distributionViewHref(projectId, "anomalies"),
                label: open ? t.footer.anomaliesOpen(open) : t.footer.anomalies,
              },
              {
                href: distributionViewHref(projectId, "history"),
                label: t.footer.history,
              },
            ]}
          />
          {children(ctx)}
        </div>
      ) : (
        children(ctx)
      )}
    </div>
  );
}
