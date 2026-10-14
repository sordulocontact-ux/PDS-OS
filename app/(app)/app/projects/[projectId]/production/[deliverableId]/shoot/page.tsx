import { notFound, redirect } from "next/navigation";

import { EquipmentReturnSection } from "@/components/production/shoot/equipment-return-section";
import { IncidentsSection } from "@/components/production/shoot/incidents-section";
import { ShootFilesSection } from "@/components/production/shoot/shoot-files-section";
import { ShootReportSection } from "@/components/production/shoot/shoot-report-section";
import { ShootStateSection } from "@/components/production/shoot/shoot-state-section";
import { ShootDay } from "@/components/production/shoot/shoot-day";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { effectiveLogistics } from "@/lib/production/logistics";
import { proposedFollowUps } from "@/lib/production/shoot/follow-ups";
import { shootReport } from "@/lib/production/shoot/report";
import { loadProductionSheet } from "@/lib/production/sheet";
import { preprodFor, shootFor } from "@/lib/production/tab-data";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionShoot;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production › one deliverable › Tournage (ticket « Workflow
 * Production complet », parcours 11 to 13): the shoot's state, the
 * declarations on rushes, sources and backup, the incidents, the
 * equipment's return and the shoot report. Everything shown as a state, a
 * count or a blocker is computed by code; a declaration is a person's word,
 * never a check of the files. Written by the owner while the « production »
 * stage runs; read by whoever sees the project.
 */
export default async function ProductionShootPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/shoot">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  const sheet = data.sheet;
  if (!sheet) redirect(routes.projectProductionSheet(projectId, deliverableId));

  const [shootData, preprod] = await Promise.all([
    shootFor(projectId, deliverableId, access),
    preprodFor(projectId, deliverableId, access),
  ]);
  if (!shootData) notFound();
  const { shoot, incidents, equipment, openTaskTitles } = shootData;
  const today = todayInParis();
  const shootDate = effectiveLogistics(sheet.logistics, data.heritage.fiche)
    .shootDate.value;
  const report = shootReport(shoot, incidents, equipment);
  const followUps = proposedFollowUps({
    deliverableTitle: data.deliverable.title,
    shoot,
    incidents,
    equipment,
    openTaskTitles,
    today,
    directorPersonId:
      sheet?.director?.kind === "person" ? sheet.director.id : null,
  });
  const canOrganize = data.canOrganize;
  const status =
    data.stageState !== "in_progress"
      ? t.locked
      : !canOrganize
        ? t.readOnly
        : null;
  const common = { projectId, sheetId: sheet.id, canOrganize };

  return (
    <div className="flex flex-col gap-10">
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <ShootStateSection
        {...common}
        shoot={shoot}
        shootDate={shootDate}
        ready={sheet.readyAt !== null}
        preproductionHref={routes.projectProductionStep(
          projectId,
          deliverableId,
          "preproduction",
        )}
      />
      {(sheet.readyAt !== null || shoot.state === "in_progress") && (
        <ShootDay
          callSheet={preprod?.callSheet ?? null}
          logistics={sheet.logistics}
          needs={data.needs}
          actions={preprod?.actions ?? []}
          openIncidents={incidents.filter((i) => i.resolvedAt === null).length}
          incidentsHref="#shoot-incidents"
        />
      )}
      <ShootFilesSection
        {...common}
        shoot={shoot}
        blockers={report.postBlockers}
        members={data.members}
        contacts={data.contacts}
      />
      <IncidentsSection
        {...common}
        incidents={incidents}
        members={data.members}
        contacts={data.contacts}
      />
      <EquipmentReturnSection
        {...common}
        equipment={equipment}
        closingBlockers={report.closingBlockers}
        today={today}
        members={data.members}
        contacts={data.contacts}
      />
      <ShootReportSection
        {...common}
        shoot={shoot}
        shootDate={shootDate}
        report={report}
        followUps={followUps}
        members={data.members}
      />
    </div>
  );
}
