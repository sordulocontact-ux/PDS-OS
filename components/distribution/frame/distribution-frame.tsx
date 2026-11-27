import { notFound, redirect } from "next/navigation";

import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { DistributionReleaseProvider } from "@/components/distribution/frame/release-scope";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { distribution } from "@/lib/i18n/fr/distribution";
import { requireApproved } from "@/lib/auth/dal";
import { collectiveReleases } from "@/lib/i18n/fr/collective-releases";
import { getProject } from "@/lib/projects/queries";
import type { ProjectDetail } from "@/lib/projects/types";
import { loadCollectiveReleases } from "@/lib/release/collective-releases";
import type { CrumbOption } from "@/lib/ui/module-frame";
import { ProjectHeader } from "@/components/projects/project-header";
import { JourneyLayout } from "@/components/shell/journey/journey-layout";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import { DistributionRolesButton } from "@/components/distribution/frame/distribution-roles";
import { defaultCollectiveRelease } from "@/lib/distribution/default-release";
import { distributionStatus } from "@/lib/distribution/journey";
import {
  distributionContext,
  distributionLaunched,
  type DistributionContext,
} from "@/lib/distribution/journey-context";
import { isOpen } from "@/lib/distribution/anomalies";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { withRelease } from "@/lib/distribution/scope";
import {
  DISTRIBUTION_STEPS,
  distributionStepHref,
  distributionViewHref,
  type DistributionStep,
} from "@/lib/ui/distribution-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";
import { stepChoiceKey } from "@/lib/step-tools/model";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney;

/**
 * The dates the Distribution hangs on: the Master final and the release
 * (Sacha, 27/11/2026: no « « Néons » · artiste · format », the project's bar
 * and the trail name them, nor « Distributeur The Orchard », always the same).
 */
function factsOf(ctx: DistributionContext): ModuleFact[] {
  const { dates } = ctx;
  return [
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
  ];
}

/**
 * The frame of every Distribution page (docs/VISION-UX.md § 4,
 * JourneyLayout): the journey on the left, on its right the head (h1 = the
 * step's title, its why, the module's facts, « Qui fait quoi ») and the
 * open step. The two views of the journey's foot (Anomalies, Historique)
 * keep the module's head (« Distribution », its state, its facts) and take
 * the full width. Before the plan is launched, the module's lock leads to
 * the plan.
 */
export async function DistributionFrame({
  projectId,
  releaseId: named = null,
  shownKey,
  children,
}: {
  projectId: string;
  // A collective's release (lot 15, `?sortie=`); none: a simple project.
  releaseId?: string | null;
  // The step shown on the right; none for a view.
  shownKey?: string;
  children: (ctx: DistributionContext) => React.ReactNode;
}) {
  // A collective's Distribution is a release's (lot 15): without one named,
  // its default release, the others chosen in the trail (Maël 26/11/2026);
  // « Sorties » only when it has none. A release not of the project is not
  // found.
  const read = await getProject(projectId);
  const releaseId =
    read?.collective && !named
      ? await defaultCollectiveRelease(projectId)
      : named;
  if (read?.collective && !releaseId)
    redirect(routes.projectReleases(projectId));
  const ctx = await distributionContext(
    projectId,
    read?.collective ? releaseId : null,
  );
  if (!ctx && read?.collective && (await distributionLaunched(projectId)))
    notFound();
  if (!ctx) return <WorkflowLocked projectId={projectId} title={t.module} />;
  const scope = ctx.releaseId;
  const status = distributionStatus(ctx.steps);
  // A collective: its release in the trail, the others to choose from
  // (Maël 23/11/2026, « 1 par son », as the Master's titles).
  const crumbs =
    read?.collective && ctx.release
      ? [
          await releaseCrumb(
            read,
            ctx.release.id,
            ctx.release.label,
            DISTRIBUTION_STEPS.find((key) => key === shownKey),
          ),
        ]
      : undefined;
  const open = ctx.anomalies.filter(isOpen).length;
  const stepRef = {
    projectId,
    module: "distribution" as const,
    stepKey: shownKey ?? ctx.steps[0]?.key ?? "prep",
  };
  const choices = ctx.steps.map((s) => ({
    key: stepChoiceKey({ module: "distribution", stepKey: s.key }),
    label: s.title,
  }));
  const actions = (
    <>
      {ctx.release && (
        <ViewLink
          href={routes.projectReleases(projectId)}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ButtonRoll>{t.releases}</ButtonRoll>
        </ViewLink>
      )}
      <DistributionRolesButton ctx={ctx} />
    </>
  );
  // A release archived or its title abandoned: read only (lot 15).
  const readOnly = ctx.release?.readOnly ? (
    <ToneCallout tone="neutral">
      {fr.distribution.validation.gate.readOnly[ctx.release.readOnly]}
    </ToneCallout>
  ) : null;
  // Blockers and noted information of the module (sub-lot C6).
  const attention = (
    <ModuleAttention
      stepRef={stepRef}
      modules={["distribution"]}
      steps={choices}
    />
  );
  const shown = ctx.steps.find((s) => s.key === shownKey);
  if (!shown)
    return (
      <DistributionReleaseProvider releaseId={scope}>
        <div className="flex flex-col gap-5">
          <ProjectHeader
            projectId={projectId}
            title={t.module}
            status={{
              label: t.status[status],
              tone: workflowStatusTone[status],
            }}
            facts={factsOf(ctx)}
            steps={ctx.steps}
            extraCrumbs={crumbs}
            actions={actions}
          />
          {attention}
          {readOnly}
          {children(ctx)}
        </div>
      </DistributionReleaseProvider>
    );
  return (
    <DistributionReleaseProvider releaseId={scope}>
      <JourneyLayout
        spine={
          <JourneySpine
            steps={ctx.steps}
            openKey={shown.key}
            footer={{
              href: distributionViewHref(projectId, "anomalies", scope),
              label: open ? t.footer.anomaliesOpen(open) : t.footer.anomalies,
            }}
          />
        }
        head={
          <>
            <ProjectHeader
              projectId={projectId}
              head={shown}
              facts={factsOf(ctx)}
              steps={ctx.steps}
              extraCrumbs={crumbs}
              actions={actions}
            />
            {attention}
            {readOnly}
          </>
        }
      >
        {children(ctx)}
      </JourneyLayout>
    </DistributionReleaseProvider>
  );
}

/** The release shown, with the collective's other live releases to choose
 * from, with where its deposit stands: each opens on the step shown here,
 * else on the step that waits there (/release?sortie=). A title's release: its name opens the title's
 * page (« Titres », Maël 25/11/2026); the compilation has no page. */
async function releaseCrumb(
  project: ProjectDetail,
  releaseId: string,
  label: string,
  shownKey?: DistributionStep,
): Promise<{ label: string; href?: string; options?: CrumbOption[] }> {
  const access = await requireApproved();
  const { releases } = await loadCollectiveReleases(project, access);
  const titleId = releases.find((r) => r.id === releaseId)?.titleId;
  const crumb = {
    label,
    href: titleId ? routes.projectTrack(project.id, titleId) : undefined,
  };
  const live = releases.filter((r) => !r.abandoned || r.id === releaseId);
  if (live.length < 2) return crumb;
  const words = collectiveReleases.distribution;
  return {
    ...crumb,
    options: live.map((r) => ({
      key: r.id,
      label: r.label,
      href: shownKey
        ? distributionStepHref(project.id, shownKey, r.id)
        : withRelease(routes.projectRelease(project.id), r.id),
      detail: words[r.distribution.key](r.distribution.number),
      current: r.id === releaseId,
      done: r.distribution.key === "closed",
    })),
  };
}
