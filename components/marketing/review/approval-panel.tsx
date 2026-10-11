import Link from "next/link";

import { DecisionForm } from "@/components/marketing/review/decision-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Dashboard } from "@/lib/marketing/dashboard";
import { submitReport } from "@/lib/marketing/reports/approval-actions";
import type { Approval } from "@/lib/marketing/reports/approvals";
import type { ReportDetail } from "@/lib/marketing/reports/queries";
import { formatLongDay } from "@/lib/project-history/format";
import { marketingReportTone } from "@/lib/ui/state-tones";

const t = fr.marketingReview.approval;

/**
 * Écran 3 beside a version: where its validation stands and the one action
 * the viewer may take — the owner submits, the validator decides (never on a
 * version they prepared), everyone reads the decisions taken on it.
 */
export function ApprovalPanel({
  projectId,
  report,
  figures,
  approvals,
  latest,
  viewer,
}: {
  projectId: string;
  report: ReportDetail;
  figures: Dashboard;
  // Decisions on this version, newest first.
  approvals: Approval[];
  // The newest version of the project.
  latest: { id: string; version: number };
  viewer: {
    personId: string | null;
    isOwner: boolean;
    canValidate: boolean;
  };
}) {
  const last = approvals[0] ?? null;
  const isLatest = latest.id === report.id;
  // Separation of roles: who generated or submitted never decides.
  const preparedByViewer =
    viewer.personId !== null &&
    (viewer.personId === report.authorPersonId ||
      viewer.personId === report.submitterPersonId);
  const f = figures.figures;
  const declared =
    (f.publications_declared.value ?? 0) +
    (f.coverage_declared.value ?? 0) +
    (f.statistics_declared.value ?? 0);
  const toVerify =
    (f.publications_to_verify.value ?? 0) + (f.coverage_to_verify.value ?? 0);
  const date = (iso: string) => formatLongDay(iso);

  return (
    <section
      aria-labelledby="approval-title"
      className="grid content-start gap-4 rounded-2xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="approval-title" className="text-base font-medium">
          {t.title}
        </h2>
        <StatusBadge tone={marketingReportTone[report.state]} size="sm">
          {fr.marketingReview.reports.states[report.state]}
        </StatusBadge>
      </div>

      {!isLatest && (
        <ToneCallout tone="warning">
          {t.superseded(latest.version)}{" "}
          <Link
            href={routes.projectReviewReport(projectId, latest.id)}
            className="underline underline-offset-4"
          >
            {t.openCurrent}
          </Link>
        </ToneCallout>
      )}

      {report.state === "generated" &&
        isLatest &&
        (viewer.isOwner ? (
          <ConfirmButton
            label={t.submit}
            variant="default"
            size="lg"
            title={t.submitTitle}
            body={t.submitBody}
            confirmLabel={t.submit}
            pendingLabel={t.submitting}
            done={t.submitted}
            run={submitReport.bind(null, { projectId, reportId: report.id })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.generatedHint}</p>
        ))}

      {report.state === "to_validate" &&
        (viewer.canValidate && isLatest ? (
          preparedByViewer ? (
            <ToneCallout tone="warning">{t.selfApproval}</ToneCallout>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t.review.intro}</p>
              <div className="grid gap-1">
                <h3 className="text-sm font-medium">{t.review.reserves}</h3>
                {report.snapshot.reserves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t.review.noReserves}
                  </p>
                ) : (
                  <ul className="grid gap-1 text-sm">
                    {report.snapshot.reserves.map((r) => (
                      <li key={r.id}>{r.description}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid gap-1">
                <h3 className="text-sm font-medium">{t.review.unverified}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.review.unverifiedLine(
                    declared,
                    toVerify,
                    f.statistics_unavailable.value ?? 0,
                  )}
                </p>
              </div>
              <DecisionForm
                projectId={projectId}
                reportId={report.id}
                version={report.version}
                hasReserves={report.snapshot.reserves.length > 0}
              />
            </>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.waiting(report.submitterName)}
          </p>
        ))}

      {last && report.state !== "to_validate" && (
        <ToneCallout
          tone={
            last.decision === "approved_provisional" ? "success" : "warning"
          }
        >
          {last.decision === "approved_provisional"
            ? t.approved(last.validatorName, date(last.decidedAt))
            : last.decision === "changes_requested"
              ? t.changesRequested(last.validatorName, date(last.decidedAt))
              : t.postponed(last.validatorName, date(last.decidedAt))}
          {last.comment && (
            <span className="mt-1 block whitespace-pre-line">
              {last.comment}
            </span>
          )}
        </ToneCallout>
      )}
      {report.state === "approved_provisional" && (
        <p className="text-sm text-muted-foreground">{t.approvedNote}</p>
      )}
      {report.state === "changes_requested" && viewer.isOwner && isLatest && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          render={<Link href={routes.projectReviewReportNew(projectId)} />}
          nativeButton={false}
        >
          {t.newVersion}
        </Button>
      )}
      {report.state === "postponed" && isLatest && (
        <>
          <p className="text-sm text-muted-foreground">{t.resubmitHint}</p>
          {viewer.isOwner && (
            <ConfirmButton
              label={t.submit}
              size="sm"
              title={t.submitTitle}
              body={t.submitBody}
              confirmLabel={t.submit}
              pendingLabel={t.submitting}
              done={t.submitted}
              run={submitReport.bind(null, { projectId, reportId: report.id })}
            />
          )}
        </>
      )}

      {approvals.length > 0 && (
        <div className="grid gap-1">
          <h3 className="text-sm font-medium">{t.history}</h3>
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {approvals.map((a) => (
              <li key={a.id}>
                {t.decisionLine(
                  t.review.decisions[a.decision],
                  a.validatorName,
                  date(a.decidedAt),
                )}
                <span className="block text-caption">
                  {t.reservesKept(a.reservesCount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
