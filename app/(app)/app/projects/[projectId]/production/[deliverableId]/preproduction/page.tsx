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
import { LocationsBoard } from "@/components/production/locations/locations-board";
import { CallSheetPublish } from "@/components/production/preprod/call-sheet-publish";
import { requireApproved } from "@/lib/auth/dal";
import { loadLocations } from "@/lib/production/locations/queries";
import {
  callSheetContent,
  callSheetGaps,
  sameContent,
} from "@/lib/production/preprod/call-sheet-snapshot";
import { formatDateTime } from "@/lib/release/format";
import { loadProviderLinks } from "@/lib/production/post/requests";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { preprodOverview } from "@/lib/production/preprod/overview";
import {
  proposePlan,
  reschedulePlan,
} from "@/lib/production/preprod/plan-template";
import { dueByStep } from "@/lib/production/preprod/schedule";
import { loadContactDetails } from "@/lib/production/preprod/reads";
import { loadProductionSheet } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
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

  const preprod = await preprodFor(projectId, deliverableId, access);
  if (!preprod) notFound();
  const contactIds = [
    ...(sheet.director?.kind === "contact" ? [sheet.director.id] : []),
    ...data.needs.flatMap((n) =>
      n.assignments.flatMap((a) =>
        a.holder.kind === "contact" ? [a.holder.id] : [],
      ),
    ),
  ];
  const supabase = await createClient();
  const [details, locations, links, versionsRes, projectRes] =
    await Promise.all([
      loadContactDetails(contactIds),
      loadLocations(sheet.id, data, access),
      loadProviderLinks(supabase, sheet.id),
      supabase
        .from("production_call_sheet_versions")
        .select("number, published_at, published_by, content")
        .eq("sheet_id", sheet.id)
        .order("number", { ascending: false }),
      supabase
        .from("projects")
        .select("title")
        .eq("id", projectId)
        .maybeSingle(),
    ]);
  const today = todayInParis();
  const o = preprodOverview(data, preprod, today);
  const due = dueByStep(o.logistics, today);
  // What the call sheet would publish now, and what it lacks (PROD-016).
  const content = callSheetContent({
    project: projectRes.data?.title ?? "",
    deliverable: data.deliverable.title,
    manager: data.ownerName,
    shootDate: o.logistics.shootDate.value,
    logistics: sheet.logistics,
    director: sheet.director,
    needs: data.needs,
    equipment: preprod.equipment,
    callSheet: preprod.callSheet,
    details,
  });
  const versions = versionsRes.data ?? [];
  const personName = (id: string | null) =>
    data.members.find((m) => m.personId === id)?.name ?? "—";
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
        actions={preprod.actions}
        {...people}
      />
      <PlanSection
        {...common}
        {...people}
        actions={preprod.actions}
        states={o.actionStates}
        planState={o.planState}
        items={preprod.items}
        template={{
          deliverableId,
          missing: proposePlan({
            brief: sheet.brief,
            due,
            today,
            existing: new Set(
              preprod.actions.flatMap((a) =>
                a.templateKey ? [a.templateKey] : [],
              ),
            ),
            hasDirector: sheet.director !== null,
          }).length,
          reschedule: reschedulePlan({ actions: preprod.actions, due, today }),
        }}
      />
      <LocationSection {...common} logistics={sheet.logistics}>
        {access.organizationId && (
          <LocationsBoard
            scope={{
              projectId,
              sheetId: sheet.id,
              organizationId: access.organizationId,
            }}
            data={locations}
            links={links}
            canOrganize={can}
            {...people}
          />
        )}
      </LocationSection>
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
        ownerName={data.ownerName}
        ready={sheet.readyAt !== null}
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
      >
        <CallSheetPublish
          projectId={projectId}
          deliverableId={deliverableId}
          sheetId={sheet.id}
          deliverableTitle={data.deliverable.title}
          gaps={callSheetGaps(content, {
            locationConfirmed: sheet.logistics.locationStatus === "confirmed",
            availabilityToConfirm: o.staffing.toConfirm,
          })}
          versions={versions.map((v) => ({
            number: v.number,
            line: fr.productionPreprod.callSheet.publish.version(
              v.number,
              personName(v.published_by),
              formatDateTime(v.published_at),
            ),
          }))}
          changedSince={
            versions.length > 0 && !sameContent(versions[0].content, content)
          }
          emails={[
            ...new Set(content.team.flatMap((m) => (m.email ? [m.email] : []))),
          ]}
          canOrganize={can}
        />
      </CallSheetSection>
      <ReadinessSection
        {...common}
        rows={o.checks}
        evidence={o.evidence}
        readyAt={sheet.readyAt}
        readyBy={sheet.readyBy}
        {...people}
      />
    </div>
  );
}
