import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import type { FollowUp } from "@/lib/production/shoot/follow-ups";
import type { ShootReport } from "@/lib/production/shoot/report";
import type { ShootRecord } from "@/lib/production/shoot/rules";
import type { Member } from "@/lib/framing/related";
import { formatDate } from "@/lib/release/format";
import { shootReportTone } from "@/lib/ui/state-tones";

import { FollowUpsList } from "./follow-ups-list";
import { ReportValidateForm } from "./report-validate-form";
import { PostBlockersCallout } from "./post-blockers-callout";

const t = fr.productionShoot.report;
const s = fr.productionShoot;

/** Parcours 13: the report put together by code (state, declarations,
 * incidents, equipment, deviations), never claiming a file was inspected;
 * the follow-ups PO proposes; validated by the owner, it becomes a source
 * of the postproduction. */
export function ShootReportSection({
  projectId,
  sheetId,
  shoot,
  shootDate,
  report,
  followUps,
  members,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  shootDate: string | null;
  report: ShootReport;
  followUps: FollowUp[];
  members: Member[];
  canOrganize: boolean;
}) {
  const status = report.validated
    ? "validated"
    : report.ended
      ? "to_validate"
      : "not_ended";
  const returnLabel = s.equipment.returnState[report.returnState];
  return (
    <PageSection
      id="shoot-report"
      title={t.title}
      description={t.description}
      action={
        status !== "not_ended" && (
          <StatusBadge tone={shootReportTone[status]}>
            {status === "validated" ? t.validated : t.toValidate}
          </StatusBadge>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <ToneCallout tone="neutral">{t.notInspected}</ToneCallout>
        <FactList
          emptyLabel={s.state.notFilled}
          facts={[
            { label: t.facts.state, value: s.state.labels[shoot.state] },
            {
              label: t.facts.times,
              value: shoot.startedAt
                ? t.times(
                    formatDateTime(shoot.startedAt),
                    shoot.endedAt ? formatDateTime(shoot.endedAt) : null,
                  )
                : null,
            },
            {
              label: t.facts.shootDate,
              value: shootDate ? formatDate(shootDate) : null,
            },
            {
              label: t.facts.declarations,
              value: t.declarationsCount(
                report.declarationsDone,
                report.declarationsTotal,
              ),
            },
            { label: t.facts.location, value: shoot.filesLocation },
            {
              label: t.facts.incidents,
              value: t.incidentsCount(
                report.incidentsOpen,
                report.incidentsResolved,
              ),
            },
            {
              label: t.facts.equipment,
              value: t.equipmentCount(
                returnLabel,
                report.equipmentReturned,
                report.equipmentTotal,
              ),
            },
            { label: t.facts.missing, value: shoot.missingSequences },
            { label: t.facts.deviations, value: shoot.deviations },
          ]}
        />
        <PostBlockersCallout blockers={report.postBlockers} />
        <FollowUpsList
          projectId={projectId}
          followUps={followUps}
          members={members}
          canOrganize={canOrganize}
        />
        {report.validated && shoot.reportValidatedAt && (
          <p className="text-sm text-muted-foreground">
            {t.validatedBy(
              shoot.reportValidatedBy ?? "—",
              formatDateTime(shoot.reportValidatedAt),
            )}{" "}
            {t.reopenNote}
          </p>
        )}
        {!report.ended && (
          <p className="text-sm text-muted-foreground">{t.notEnded}</p>
        )}
        {canOrganize && (
          <ReportValidateForm
            projectId={projectId}
            sheetId={sheetId}
            note={shoot.reportNote}
            canValidate={report.canValidate}
          />
        )}
        {!canOrganize && shoot.reportNote && (
          <FactList facts={[{ label: t.note, value: shoot.reportNote }]} />
        )}
      </div>
    </PageSection>
  );
}
