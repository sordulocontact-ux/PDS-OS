import { notFound, redirect } from "next/navigation";

import { BudgetBlock } from "@/components/production/preprod/budget-block";
import { CallSheetSection } from "@/components/production/preprod/call-sheet-section";
import { EquipmentSection } from "@/components/production/preprod/equipment-section";
import { LocationSection } from "@/components/production/preprod/location-section";
import { PlanSection } from "@/components/production/preprod/plan-section";
import { PreprodSummary } from "@/components/production/preprod/preprod-summary";
import { ReadinessSection } from "@/components/production/preprod/readiness-section";
import { ScheduleSection } from "@/components/production/preprod/schedule-section";
import { TeamBriefsSection } from "@/components/production/preprod/team-briefs-section";
import { TechnicalCallSection } from "@/components/production/preprod/technical-call-section";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { preprodOverview } from "@/lib/production/preprod/overview";
import { loadPreprod } from "@/lib/production/preprod/queries";
import { loadContactDetails } from "@/lib/production/preprod/reads";
import { loadProductionSheet } from "@/lib/production/sheet";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.productionPreprod;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Production › one deliverable › Préproduction (ticket
 * « Workflow Production complet », parcours 4 à 10): team briefs, the
 * technical call and what it produced, the preproduction plan, the
 * location, equipment and quotes, the backward schedule and budget, the
 * call sheet and the checks before the shoot. States, dates and totals are
 * computed by code; PO only proposes call points, confirmed by a person.
 * Written by the owner while the « production » stage runs; read by whoever
 * sees the project. A summary at the top links to each block.
 */
export default async function ProductionPreproductionPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/preproduction">) {
  const { projectId, deliverableId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data) notFound();
  const sheet = data.sheet;
  if (!sheet) redirect(routes.projectProductionSheet(projectId, deliverableId));

  const preprod = await loadPreprod(projectId, { ...data, sheet });
  const contactIds = [
    ...(sheet.director?.kind === "contact" ? [sheet.director.id] : []),
    ...data.needs.flatMap((n) =>
      n.assignments.flatMap((a) =>
        a.holder.kind === "contact" ? [a.holder.id] : [],
      ),
    ),
  ];
  const details = await loadContactDetails(contactIds);
  const today = todayInParis();
  const o = preprodOverview(data, preprod, today);
  const can = data.canOrganize;
  const status =
    data.stageState !== "in_progress" ? t.locked : !can ? t.readOnly : null;
  const common = { projectId, sheetId: sheet.id, canOrganize: can };
  const people = { members: data.members, contacts: data.contacts };

  return (
    <div className="flex flex-col gap-10">
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      <PreprodSummary
        overview={o}
        preprod={preprod}
        today={today}
        locationStatus={sheet.logistics.locationStatus}
      />
      <TeamBriefsSection
        {...common}
        deliverableId={deliverableId}
        briefs={o.briefs}
        rows={preprod.briefs}
        needs={data.needs}
        director={sheet.director}
      />
      <TechnicalCallSection
        projectId={projectId}
        input={{ data: { ...data, sheet }, preprod, logistics: o.logistics }}
        calls={preprod.calls}
        canOrganize={can}
      />
      <PlanSection
        {...common}
        {...people}
        actions={preprod.actions}
        states={o.actionStates}
        planState={o.planState}
        items={preprod.items}
      />
      <LocationSection {...common} logistics={sheet.logistics} />
      <EquipmentSection
        {...common}
        {...people}
        organizationId={access.organizationId}
        preprod={preprod}
        brief={sheet.brief}
        today={today}
      />
      <ScheduleSection
        {...common}
        own={sheet.logistics}
        logistics={o.logistics}
        schedule={o.schedule}
      >
        <BudgetBlock
          {...common}
          lines={preprod.budget}
          totals={o.budget}
          equipment={preprod.equipment}
        />
      </ScheduleSection>
      <CallSheetSection
        {...common}
        callSheet={preprod.callSheet}
        shootDate={o.logistics.shootDate.value}
        logistics={sheet.logistics}
        director={sheet.director}
        needs={data.needs}
        equipment={preprod.equipment}
        details={details}
      />
      <ReadinessSection
        {...common}
        rows={o.checks}
        evidence={o.evidence}
        readyAt={sheet.readyAt}
        readyBy={sheet.readyBy}
      />
    </div>
  );
}
