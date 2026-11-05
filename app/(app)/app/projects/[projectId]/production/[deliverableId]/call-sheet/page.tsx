import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { CallSheetPublish } from "@/components/production/preprod/call-sheet-publish";
import { CallSheetSection } from "@/components/production/preprod/call-sheet-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { callSheetDefaults } from "@/lib/production/preprod/call-sheet-defaults";
import {
  callSheetContent,
  callSheetGaps,
  sameContent,
} from "@/lib/production/preprod/call-sheet-snapshot";
import { loadContactDetails } from "@/lib/production/preprod/reads";
import { formatDateTime } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

/** The call sheet composed from what is validated — place, team, gear,
 * schedule —, what it lacks, then its dated versions for the team (PROD-016). */
export default async function ProductionCallSheetStepPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/call-sheet">) {
  const { projectId, deliverableId } = await params;
  const { step, steps } = await stepContext(
    projectId,
    deliverableId,
    "call-sheet",
  );
  const { data, sheet, preprod, o, common } = await prepContext(
    projectId,
    deliverableId,
  );
  const contactIds = [
    ...(sheet.director?.kind === "contact" ? [sheet.director.id] : []),
    ...data.needs.flatMap((n) =>
      n.assignments.flatMap((a) =>
        a.holder.kind === "contact" ? [a.holder.id] : [],
      ),
    ),
  ];
  const supabase = await createClient();
  const [details, versionsRes, projectRes] = await Promise.all([
    loadContactDetails(contactIds),
    supabase
      .from("production_call_sheet_versions")
      .select("number, published_at, published_by, content")
      .eq("sheet_id", sheet.id)
      .order("number", { ascending: false }),
    supabase.from("projects").select("title").eq("id", projectId).maybeSingle(),
  ]);
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
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
    >
      <CallSheetSection
        {...common}
        callSheet={preprod.callSheet}
        proposed={callSheetDefaults(
          preprod.callSheet,
          sheet.brief,
          data.heritage.fiche,
        )}
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
          canOrganize={data.canOrganize}
        />
      </CallSheetSection>
    </ProductionStepPanel>
  );
}
