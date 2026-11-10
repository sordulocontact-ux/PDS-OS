import { ReportView } from "@/components/marketing/review/report-view";
import { StepSection } from "@/components/shell/journey/step-section";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { VersionCard } from "@/components/ui/version-card";
import { routes } from "@/lib/auth/redirects";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type { ReviewContext } from "@/lib/marketing/review/context";
import { reportFigures } from "@/lib/marketing/reports/model";
import { loadReport, type ReportDetail } from "@/lib/marketing/reports/queries";
import { marketingReportTone } from "@/lib/ui/state-tones";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

import { ReportDialogButton } from "./report-dialog-button";

const fr = { marketingReview, reviewJourney };

const t = fr.reviewJourney.bilan;
const f = t.facts;
const states = fr.marketingReview.reports.states;

const period = (r: ReportDetail) =>
  r.periodStart && r.periodEnd
    ? f.periodValue(formatDay(r.periodStart), formatDay(r.periodEnd))
    : "—";

/**
 * « Rapports » in the step « Bilan provisoire » (proto `versionCard`): one
 * card per version, the newest and the approved one open — its summary,
 * period, scope, reserves and fingerprint, the decider's words, then
 * « Voir le rapport » (the frozen report in a modal, exported in PDF).
 */
export async function ReportCards({ ctx }: { ctx: ReviewContext }) {
  const { project, reports, approvals, access } = ctx;
  const details = (
    await Promise.all(reports.map((r) => loadReport(project.id, r.id, access)))
  ).filter((d): d is ReportDetail => d !== null);
  if (details.length === 0) return null;
  return (
    <StepSection title={t.reports}>
      {details.map((r, index) => {
        const title = t.versionTitle(project.title, r.version);
        const decision = approvals.find(
          (a) => a.reportId === r.id && a.comment,
        );
        const previous = details[index + 1];
        const generated = formatShortInstant(r.createdAt);
        const body = (
          <ReportBody
            report={r}
            title={title}
            projectId={project.id}
            projectTitle={project.title}
            decision={decision}
            previousId={previous?.id ?? null}
            flush={index === 0}
          />
        );
        const status = {
          tone: marketingReportTone[r.state],
          label: states[r.state],
        };
        if (index === 0)
          return (
            <DocumentCard
              key={r.id}
              name={title}
              line={t.generatedBy(r.authorName ?? "—", generated)}
              action={
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              }
            >
              {body}
            </DocumentCard>
          );
        return (
          <VersionCard
            key={r.id}
            title={title}
            status={status}
            meta={t.generatedBy(r.authorName ?? "—", generated)}
            defaultOpen={
              r.state === "approved_provisional" || r.state === "finalized"
            }
          >
            {body}
          </VersionCard>
        );
      })}
    </StepSection>
  );
}

/** What a report says (its facts, the decider's words) and « Voir le
 * rapport »; flush against the frame of a `DocumentCard`. */
function ReportBody({
  report: r,
  title,
  projectId,
  projectTitle,
  decision,
  previousId,
  flush,
}: {
  report: ReportDetail;
  title: string;
  projectId: string;
  projectTitle: string;
  decision: ReviewContext["approvals"][number] | undefined;
  previousId: string | null;
  flush: boolean;
}) {
  const reserves = r.snapshot.reserves.length;
  const hash = r.contentHash.slice(0, 8);
  const generated = formatShortInstant(r.createdAt);
  return (
    <>
      <FactRows className={flush ? "rounded-none border-0" : undefined}>
        <FactRow label={f.summary} value={r.snapshot.summary ?? "—"} />
        <FactRow label={f.period} value={period(r)} />
        <FactRow
          label={f.scope}
          value={f.scopeValue(
            r.activationIds.length,
            r.snapshot.excluded.length,
          )}
        />
        <FactRow
          label={f.reserves}
          value={reserves ? String(reserves) : f.none}
        />
        <FactRow
          label={f.fingerprint}
          value={
            <span title={r.contentHash}>
              <code>{hash}</code>
              {` · ${fr.marketingReview.reports.meta.rules(r.rulesVersion).toLowerCase()}`}
            </span>
          }
        />
      </FactRows>
      <div className={flush ? "flex flex-col gap-3 p-3.5" : "contents"}>
        {decision && (
          <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {decision.validatorName} : « {decision.comment} »
          </p>
        )}
        <ReportDialogButton
          title={title}
          pdf={{
            href: routes.projectReviewReportPdf(projectId, r.id),
            fileName: fr.marketingReview.reports.pdfFileName(
              projectTitle,
              r.version,
            ),
          }}
          compareHref={
            previousId
              ? routes.projectReviewReport(projectId, r.id, previousId)
              : null
          }
        >
          <FactRows>
            <FactRow label={f.status} value={states[r.state]} />
            <FactRow label={f.period} value={period(r)} />
            <FactRow
              label={f.scope}
              value={
                r.snapshot.excluded.length
                  ? f.scopeExcluded(
                      r.activationIds.length,
                      r.snapshot.excluded.map((x) => x.title).join(", "),
                    )
                  : f.scopeValue(r.activationIds.length, 0)
              }
            />
            <FactRow
              label={f.generated}
              value={f.generatedValue(r.authorName ?? "—", generated)}
            />
            <FactRow
              label={f.fingerprint}
              value={`${f.fingerprintValue(hash, r.rulesVersion)} · ${f.frozen}`}
            />
          </FactRows>
          <ReportView
            snapshot={r.snapshot}
            figures={reportFigures(r.snapshot, r.rulesVersion, r.budget)}
            budget={r.budget}
          />
        </ReportDialogButton>
      </div>
    </>
  );
}
