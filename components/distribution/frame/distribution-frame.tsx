import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { ProjectHeader } from "@/components/projects/project-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ProjectNowCard } from "@/components/shell/journey/project-now-card";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import { DistributionRolesButton } from "@/components/distribution/frame/distribution-roles";
import { distributionStatus } from "@/lib/distribution/journey";
import {
  distributionContext,
  type DistributionContext,
} from "@/lib/distribution/journey-context";
import { isOpen } from "@/lib/distribution/anomalies";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { projectFormatLabel } from "@/lib/projects/labels";
import { distributionViewHref } from "@/lib/ui/distribution-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { stepChoiceKey } from "@/lib/step-tools/model";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { distributionJourney };

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
  const ctx = await distributionContext(projectId);
  if (!ctx) return <WorkflowLocked projectId={projectId} title={t.module} />;
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
        actions={<DistributionRolesButton ctx={ctx} />}
      />
      <ProjectNowCard
        projectId={projectId}
        steps={ctx.steps}
        viewerName={ctx.viewerName}
        moduleLabel={t.module}
        shownKey={shownKey}
        labels={{ waitingTitle: t.now.waitingTitle, finished: t.now.finished }}
      />
      {/* Blockers and noted information of the module (sub-lot C6). */}
      <ModuleAttention
        stepRef={{
          projectId,
          module: "distribution",
          stepKey: shownKey ?? ctx.steps[0]?.key ?? "prep",
        }}
        modules={["distribution"]}
        steps={ctx.steps.map((s) => ({
          key: stepChoiceKey({ module: "distribution", stepKey: s.key }),
          label: s.title,
        }))}
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
