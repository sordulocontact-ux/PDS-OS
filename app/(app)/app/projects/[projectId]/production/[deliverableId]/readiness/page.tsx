import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { ReadinessSection } from "@/components/production/preprod/readiness-section";
import { ReadyConfirmForm } from "@/components/production/readiness/ready-confirm-form";
import { ReadyRequestView } from "@/components/production/readiness/ready-request-view";
import { ReadySynthesisTable } from "@/components/production/readiness/ready-synthesis-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ShootContractNotice } from "@/components/legal/contract-gaps-notice";
import { loadContractGaps } from "@/lib/legal/contract-gaps";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { loadLocations } from "@/lib/production/locations/queries";
import { callSheetEvidence } from "@/lib/production/preprod/readiness";
import { loadQuotes } from "@/lib/production/quotes/queries";
import { readySynthesis } from "@/lib/production/ready-synthesis";
import { loadStepTools } from "@/lib/step-tools/queries";
import { loadProposalVersions } from "@/lib/production/proposal/queries";
import { loadScheduleDecisions } from "@/lib/production/schedule/queries";
import { ScheduleButton } from "@/components/production/schedule/schedule-button";
import { hourFr } from "@/lib/production/schedule/model";
import { can } from "@/lib/auth/access";
import { todayInParis } from "@/lib/insights/dates";
import { formatDay } from "@/lib/utils/day";
import { createClient } from "@/lib/supabase/server";

const r = fr.productionReady;

/** « Contrôle avant tournage »: in external, the synthesis of what is
 * really ready, confirmed explicitly (with a reason when lines are not
 * ready), then kept as it was (proto, Artefact § 13); in internal, every
 * prerequisite confirmed on its evidence or by a reasoned derogation
 * (PROD-008, 017, BUG-004). */
export default async function ProductionReadinessStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/readiness">) {
  const { projectId, deliverableId } = await params;
  const { step, steps, access } = await stepContext(
    projectId,
    deliverableId,
    "readiness",
  );
  const [{ data, sheet, preprod, o, common, people }, project] =
    await Promise.all([
      prepContext(projectId, deliverableId),
      requireLaunchedProject(projectId),
    ]);
  // A collective (lot 12): the contracts the shoot will wait for, said
  // before it as information; « Prête pour tournage » stays possible.
  const gaps = project.collective
    ? await loadContractGaps(projectId, "shoot", deliverableId)
    : [];
  const panel = (children: React.ReactNode) => (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      {!sheet.readyAt && (
        <ShootContractNotice
          projectId={projectId}
          gaps={gaps}
          canOpenLegal={can(access, "manage_legal")}
          upstream
        />
      )}
      {children}
    </ProductionStepPanel>
  );
  if (sheet.organization.kind === "external") {
    const schedules = await loadScheduleDecisions(sheet.id);
    const current = schedules.find((x) => !x.replacedAt) ?? null;
    const shootDay =
      sheet.logistics.shootDate ?? data.heritage.fiche?.shootDate;
    const owner = data.ownerPersonId === access.personId;
    const s = fr.productionSchedule;
    const shot = steps.find((x) => x.key === "shoot")?.status === "done";
    const scheduleButton =
      owner && !sheet.closedAt && !shot ? (
        <ScheduleButton
          projectId={projectId}
          sheetId={sheet.id}
          current={
            current
              ? {
                  text: s.text(
                    formatDay(current.date),
                    hourFr(current.start),
                    hourFr(current.end),
                  ),
                  by: current.by ?? data.ownerName ?? "—",
                }
              : null
          }
          defaults={{
            date: current?.date ?? shootDay ?? "",
            start: current?.start ?? "08:00",
            end: current?.end ?? "19:00",
          }}
        />
      ) : null;
    if (sheet.readyAt && sheet.readySnapshot)
      return panel(
        <>
          <ToneCallout tone="success">
            <b className="font-semibold">{r.done}</b>
            {r.by(sheet.readyBy ?? "—", shortStamp(sheet.readyAt))}
            {sheet.readyForcedReason && r.despite(sheet.readyForcedReason)}
            {r.kept}
            {sheet.readyApprovedBy && r.approvedBy(sheet.readyApprovedBy)}
          </ToneCallout>
          <ReadySynthesisTable rows={sheet.readySnapshot} />
          {scheduleButton && <div>{scheduleButton}</div>}
        </>,
      );
    // A derogation asked (MKT-PROD-002): its synthesis and plan, and the
    // decision for the direction or the quote validator, never the asker.
    const request = sheet.readyRequest;
    if (request)
      return panel(
        <ReadyRequestView
          projectId={projectId}
          deliverableId={deliverableId}
          request={request}
          decides={
            request.byId !== access.personId &&
            (can(access, "administer") ||
              sheet.quoteValidatorId === access.personId)
          }
        />,
      );
    const [quotes, locations, tools, proposal] = await Promise.all([
      loadQuotes(sheet.id, data.members),
      loadLocations(sheet.id, data, access),
      loadStepTools(projectId),
      loadProposalVersions(sheet.id),
    ]);
    const chosen = locations.options.find((x) => x.status === "chosen") ?? null;
    const rows = readySynthesis({
      data,
      preprod,
      quotes,
      place: chosen && { name: chosen.name, priceCents: chosen.priceCents },
      tools,
      proposal,
      schedule: schedules.find((x) => !x.replacedAt) ?? null,
    });
    return panel(
      <>
        {sheet.readyReopened && (
          <ToneCallout tone="warning">
            {r.reopened(
              shortStamp(sheet.readyReopened.at),
              sheet.readyReopened.because.map((c) => r.changes[c]).join(", "),
            )}
          </ToneCallout>
        )}
        <p className="text-[color:var(--text-secondary)]">{r.note}</p>
        <ReadySynthesisTable
          rows={rows}
          actions={scheduleButton ? { date: scheduleButton } : undefined}
        />
        {data.canOrganize && (
          <ReadyConfirmForm
            projectId={projectId}
            deliverableId={deliverableId}
            missing={rows
              .filter((x) => !x.ok)
              .map((x) => ({
                key: x.key,
                label: x.label,
                critical: x.critical,
              }))}
            members={data.members}
            decider={
              data.members.find((m) => m.personId === sheet.quoteValidatorId)
                ?.name ?? r.direction
            }
            today={todayInParis()}
          />
        )}
      </>,
    );
  }
  const supabase = await createClient();
  const { data: versions } = await supabase
    .from("production_call_sheet_versions")
    .select("number")
    .eq("sheet_id", sheet.id)
    .order("number", { ascending: false })
    .limit(1);
  return panel(
    <ReadinessSection
      {...common}
      rows={o.checks}
      evidence={{
        ...o.evidence,
        call_sheet: callSheetEvidence(
          preprod.callSheet,
          versions?.[0]?.number ?? null,
        ),
      }}
      readyAt={sheet.readyAt}
      readyBy={sheet.readyBy}
      {...people}
    />,
  );
}
