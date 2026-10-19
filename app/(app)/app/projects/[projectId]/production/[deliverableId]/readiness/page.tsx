import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { ReadinessSection } from "@/components/production/preprod/readiness-section";
import { ReadyConfirmForm } from "@/components/production/readiness/ready-confirm-form";
import { ReadySynthesisTable } from "@/components/production/readiness/ready-synthesis-table";
import { ToneCallout } from "@/components/ui/tone-callout";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { loadLocations } from "@/lib/production/locations/queries";
import { callSheetEvidence } from "@/lib/production/preprod/readiness";
import { loadQuotes } from "@/lib/production/quotes/queries";
import { readySynthesis } from "@/lib/production/ready-synthesis";
import { loadStepTools } from "@/lib/step-tools/queries";
import { createClient } from "@/lib/supabase/server";

const r = fr.productionReady;

export const metadata = {
  title: `${fr.productionJourney.steps.readiness.title} · ${fr.app.name}`,
};

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
  const { data, sheet, preprod, o, common, people } = await prepContext(
    projectId,
    deliverableId,
  );
  const panel = (children: React.ReactNode) => (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      {children}
    </ProductionStepPanel>
  );
  if (sheet.organization.kind === "external") {
    if (sheet.readyAt && sheet.readySnapshot)
      return panel(
        <>
          <ToneCallout tone="success">
            <b className="font-semibold">{r.done}</b>
            {r.by(sheet.readyBy ?? "—", shortStamp(sheet.readyAt))}
            {sheet.readyForcedReason && r.despite(sheet.readyForcedReason)}
            {r.kept}
          </ToneCallout>
          <ReadySynthesisTable rows={sheet.readySnapshot} />
        </>,
      );
    const [quotes, locations, tools] = await Promise.all([
      loadQuotes(sheet.id, data.members),
      loadLocations(sheet.id, data, access),
      loadStepTools(projectId),
    ]);
    const chosen = locations.options.find((x) => x.status === "chosen") ?? null;
    const rows = readySynthesis({
      data,
      preprod,
      quotes,
      place: chosen && { name: chosen.name, priceCents: chosen.priceCents },
      tools,
    });
    return panel(
      <>
        <p className="text-[color:var(--text-secondary)]">{r.note}</p>
        <ReadySynthesisTable rows={rows} />
        {data.canOrganize && (
          <ReadyConfirmForm
            projectId={projectId}
            deliverableId={deliverableId}
            missing={rows.filter((x) => !x.ok).map((x) => x.label)}
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
