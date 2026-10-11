import Link from "next/link";
import { notFound } from "next/navigation";

import { ApprovalPanel } from "@/components/marketing/review/approval-panel";
import { ReportComparisonView } from "@/components/marketing/review/report-comparison";
import { ReportView } from "@/components/marketing/review/report-view";
import { BackLink } from "@/components/shell/back-link";
import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { loadApprovals } from "@/lib/marketing/reports/approvals";
import { compareReports } from "@/lib/marketing/reports/compare";
import { reportFigures } from "@/lib/marketing/reports/model";
import { listReports, loadReport } from "@/lib/marketing/reports/queries";
import { formatLongDay, formatTime } from "@/lib/project-history/format";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { marketingReportTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.marketingReview.reports;

export const metadata = {
  title: `${fr.marketingReview.tabs.reports} · ${fr.app.name}`,
};

/**
 * One version of the Marketing report (écran 2): frozen, read from its
 * snapshot, with its fingerprint, its rules version and the identifier its
 * export keeps; compared with another version on demand (?compare=).
 */
export default async function MarketingReportPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/review/reports/[reportId]">) {
  const { projectId, reportId } = await params;
  const query = await searchParams;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [report, versions, approvals] = await Promise.all([
    loadReport(projectId, reportId, access),
    listReports(projectId, access),
    loadApprovals(projectId, access),
  ]);
  if (!report) notFound();
  const figures = reportFigures(
    report.snapshot,
    report.rulesVersion,
    report.budget,
  );
  const previous = versions.find((v) => v.version < report.version) ?? null;
  const compareId =
    typeof query.compare === "string" &&
    versions.some((v) => v.id === query.compare && v.id !== report.id)
      ? query.compare
      : null;
  const other = compareId
    ? await loadReport(projectId, compareId, access)
    : null;
  const [older, newer] =
    other && other.version < report.version ? [other, report] : [report, other];
  const comparison =
    other && newer
      ? compareReports(
          {
            snapshot: older.snapshot,
            figures: reportFigures(
              older.snapshot,
              older.rulesVersion,
              older.budget,
            ),
          },
          {
            snapshot: newer.snapshot,
            figures: reportFigures(
              newer.snapshot,
              newer.rulesVersion,
              newer.budget,
            ),
          },
        )
      : null;
  const m = t.meta;
  const date = (iso: string | null) => (iso ? formatBriefDate(iso) : null);

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <BackLink href={routes.projectReviewReports(projectId)}>
          {t.back}
        </BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-display-sm font-semibold">
            {t.versionLabel(report.version)}
          </h2>
          <StatusBadge tone={marketingReportTone[report.state]}>
            {t.states[report.state]}
          </StatusBadge>
          <span className="ml-auto flex flex-wrap gap-2">
            {previous && !comparison && (
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={routes.projectReviewReport(
                      projectId,
                      report.id,
                      previous.id,
                    )}
                    scroll={false}
                  />
                }
                nativeButton={false}
              >
                {t.compare.choose}
              </Button>
            )}
            <PdfExportButton
              href={routes.projectReviewReportPdf(projectId, report.id)}
              fileName={t.pdfFileName(project.title, report.version)}
              label={t.exportPdf}
              pendingLabel={t.exporting}
              failedLabel={t.exportFailed}
              variant="outline"
            />
          </span>
        </div>
        <ul className="grid gap-0.5 text-sm text-muted-foreground">
          <li>
            {report.authorName
              ? m.generatedBy(
                  report.authorName,
                  formatLongDay(report.createdAt),
                  formatTime(report.createdAt),
                )
              : m.generatedOn(
                  formatLongDay(report.createdAt),
                  formatTime(report.createdAt),
                )}
          </li>
          <li>
            {[
              m.period(date(report.periodStart), date(report.periodEnd)),
              m.scope(report.activationIds.length),
              m.rules(report.rulesVersion),
            ].join(" · ")}
          </li>
          <li>
            <span title={m.fingerprintHint}>
              {m.fingerprint} :{" "}
              <span className="font-mono break-all">{report.contentHash}</span>
            </span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">{t.frozenNote}</p>
      </header>
      {comparison && other && newer && (
        <ReportComparisonView
          from={older.version}
          to={newer.version}
          comparison={comparison}
          hideHref={routes.projectReviewReport(projectId, report.id)}
        />
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <ReportView
            snapshot={report.snapshot}
            figures={figures}
            budget={report.budget}
          />
        </div>
        <aside className="grid content-start lg:sticky lg:top-6 lg:self-start">
          <ApprovalPanel
            projectId={projectId}
            report={report}
            figures={figures}
            approvals={approvals.filter((a) => a.reportId === report.id)}
            latest={versions[0] ?? report}
            viewer={{
              personId: access.personId,
              isOwner: canEditProject(access, project),
              canValidate: can(access, "validate"),
            }}
          />
        </aside>
      </div>
    </div>
  );
}
