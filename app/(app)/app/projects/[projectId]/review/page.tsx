import { IconRocket } from "nucleo-sharp-essential";
import Link from "next/link";

import { DashboardFigures } from "@/components/marketing/review/dashboard-figures";
import { DashboardFilterBar } from "@/components/marketing/review/dashboard-filters";
import { FigureDetail } from "@/components/marketing/review/figure-detail";
import { MetricTotals } from "@/components/marketing/review/metric-totals";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  computeDashboard,
  filtersFromParams,
  hasFilters,
  isFigureKey,
  type DashboardFilters,
} from "@/lib/marketing/dashboard";
import { loadMarketingStanding } from "@/lib/marketing/closure/queries";
import { isMarketingClosed } from "@/lib/marketing/closure/status";
import { loadDashboardInput } from "@/lib/marketing/dashboard-data";
import { loadReserves, reserveFacts } from "@/lib/marketing/reserves/queries";
import {
  ACTIVATION_KINDS,
  ACTIVATION_STATUSES,
  VERIFICATIONS,
} from "@/lib/marketing/model";
import { formatLongDay, formatTime } from "@/lib/project-history/format";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.marketingReview.dashboard;

export const metadata = {
  title: `${fr.marketingReview.title} · ${fr.app.name}`,
};

/**
 * Marketing › Suivi & bilan, the dashboard (ticket « Suivi & bilan », écran 1):
 * a live view computed on each opening from the activations and their
 * evidence, filtered by the URL, every figure opening its detail and rule.
 * A report is a frozen snapshot of it, made on the Rapports tab.
 */
export default async function MarketingDashboardPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  const query = await searchParams;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [reserves, standing] = await Promise.all([
    loadReserves(projectId, access),
    loadMarketingStanding(projectId),
  ]);
  const { input, data } = await loadDashboardInput(
    projectId,
    access,
    project,
    reserveFacts(reserves, isMarketingClosed(standing.status)),
  );
  const filters = filtersFromParams(query, {
    kinds: ACTIVATION_KINDS,
    statuses: ACTIVATION_STATUSES,
    levels: VERIFICATIONS,
  });
  const dashboard = computeDashboard(input, filters);
  const detail = isFigureKey(query.detail) ? query.detail : null;
  const path = routes.projectReview(projectId);
  const filterParams = (f: DashboardFilters) => ({
    from: f.from,
    to: f.to,
    kind: f.kind,
    owner: f.owner,
    status: f.status,
    source: f.source,
    level: f.level,
    reserve: f.reserve,
  });
  const now = new Date().toISOString();
  const live = data.activations.filter((a) => a.archivedAt === null);
  const sources = [
    ...new Set(
      data.evidence.flatMap((e) => (e.reportedBy ? [e.reportedBy.trim()] : [])),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="grid gap-8">
      <div className="grid gap-1">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <p className="text-caption text-muted-foreground">
          {t.computedAt(
            formatLongDay(now),
            formatTime(now),
            dashboard.rulesVersion,
          )}
        </p>
      </div>
      {live.length === 0 ? (
        <EmptyState
          icon={IconRocket}
          title={fr.marketing.activations.emptyTitle}
          body={t.empty}
          action={
            <Button
              variant="outline"
              size="sm"
              render={<Link href={routes.projectActivations(projectId)} />}
              nativeButton={false}
            >
              {t.emptyAction}
            </Button>
          }
        />
      ) : (
        <>
          <DashboardFilterBar
            action={path}
            filters={filters}
            owners={data.members.filter((m) =>
              live.some((a) => a.ownerPersonId === m.personId),
            )}
            sources={sources}
          />
          {hasFilters(filters) &&
            dashboard.excludedActivationIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {dashboard.figures.activations.value === 0
                  ? t.filteredEmpty
                  : t.excluded(dashboard.excludedActivationIds.length)}
              </p>
            )}
          {detail && (
            <FigureDetail
              projectId={projectId}
              figure={detail}
              dashboard={dashboard}
              activations={data.activations}
              evidence={data.evidence}
              closeHref={viewHref(path, filterParams(filters))}
            />
          )}
          <DashboardFigures
            dashboard={dashboard}
            budgetRestricted={input.budgetRestricted}
            detail={detail}
            hrefOf={(key) =>
              viewHref(path, {
                ...filterParams(filters),
                detail: detail === key ? null : key,
              })
            }
          />
          <MetricTotals metrics={dashboard.metrics} />
        </>
      )}
    </div>
  );
}
