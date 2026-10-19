import { WorkflowGate } from "@/components/plan/workflow-gate";
import { SectionTabs } from "@/components/shell/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadMarketingStanding } from "@/lib/marketing/closure/queries";
import { marketingStatusTone } from "@/lib/ui/state-tones";

const t = fr.marketingReview;

// Marketing › Suivi & bilan (ticket « Suivi & bilan »): where the Marketing
// stands as a whole — never the whole project, said beside it — then the live
// dashboard, the frozen reports and the Marketing closing, each its own URL.
// Pages check access themselves.
export default async function MarketingReviewLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  const standing = await loadMarketingStanding(projectId);
  return (
    <WorkflowGate projectId={projectId} workflow="review">
      <div className="flex flex-col gap-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t.status.label}</span>
          <StatusBadge tone={marketingStatusTone[standing.status]} size="sm">
            {t.status.values[standing.status]}
          </StatusBadge>
          <span>{t.status.projectApart}</span>
        </p>
        <SectionTabs
          label={t.tabsLabel}
          tabs={[
            {
              href: routes.projectReview(projectId),
              label: t.tabs.dashboard,
              exact: true,
            },
            {
              href: routes.projectReviewReports(projectId),
              label: t.tabs.reports,
            },
            {
              href: routes.projectReviewClosure(projectId),
              label: t.tabs.closure,
            },
          ]}
        />
        {children}
      </div>
    </WorkflowGate>
  );
}
