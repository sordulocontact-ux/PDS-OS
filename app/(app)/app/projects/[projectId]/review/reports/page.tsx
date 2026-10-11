import { IconFile, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadMarketing } from "@/lib/marketing/queries";
import { listReports } from "@/lib/marketing/reports/queries";
import { formatLongDay } from "@/lib/project-history/format";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { marketingReportTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.marketingReview.reports;

export const metadata = {
  title: `${fr.marketingReview.tabs.reports} · ${fr.app.name}`,
};

/** Marketing › Suivi & bilan › Rapports: every version, never overwritten. */
export default async function MarketingReportsPage({
  params,
}: PageProps<"/app/projects/[projectId]/review/reports">) {
  const { projectId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [reports, marketing] = await Promise.all([
    listReports(projectId, access),
    loadMarketing(projectId, access),
  ]);
  const canPrepare =
    marketing.canContribute &&
    marketing.activations.some((a) => a.archivedAt === null);
  const prepare = canPrepare ? (
    <Button
      size="sm"
      render={<Link href={routes.projectReviewReportNew(projectId)} />}
      nativeButton={false}
    >
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.prepare}
    </Button>
  ) : undefined;

  return (
    <PageSection
      id="reports"
      title={fr.marketingReview.tabs.reports}
      description={t.description}
      action={reports.length > 0 ? prepare : undefined}
    >
      {reports.length === 0 ? (
        <EmptyState
          icon={IconFile}
          title={t.emptyTitle}
          body={canPrepare ? t.emptyBody : t.emptyReadOnly}
          action={prepare}
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.columns.version}</DataTableHead>
            <DataTableHead fill>{t.columns.state}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.generated}</DataTableHead>
            <DataTableHead hideBelow="md">{t.columns.author}</DataTableHead>
            <DataTableHead hideBelow="lg">
              {t.columns.fingerprint}
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {reports.map((r) => (
              <DataTableRow key={r.id}>
                <DataTableCell>
                  <DataTableLink
                    href={routes.projectReviewReport(projectId, r.id)}
                  >
                    {t.versionLabel(r.version)}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell fill>
                  <StatusBadge tone={marketingReportTone[r.state]} size="sm">
                    {t.states[r.state]}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  {formatLongDay(r.createdAt)}
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  {r.authorName ?? "—"}
                </DataTableCell>
                <DataTableCell
                  hideBelow="lg"
                  className="font-mono text-caption text-muted-foreground"
                >
                  {r.contentHash.slice(0, 12)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
