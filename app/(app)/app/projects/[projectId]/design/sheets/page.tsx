import { notFound } from "next/navigation";

import { DesignStepFrame } from "@/components/design/design-step-frame";
import { SheetCard } from "@/components/design/sheets-step/sheet-card";
import { DesignWaits } from "@/components/design/waiting-row";
import { sheetAction } from "@/lib/design/journey";
import { designJourneyContext } from "@/lib/design/journey-context";
import { loadSheetViews } from "@/lib/design/sheet-views";
import { fr } from "@/lib/i18n/fr";
import { isLocked } from "@/lib/ui/journey";

export const metadata = {
  title: `${fr.designJourney.steps.sheets.title} · ${fr.app.name}`,
};

/**
 * Conception › Fiches Livrables (proto de3, ticket § 9 to 13): one card per
 * sheet, created from the validated Stratégie and pre-filled by code with
 * its sources; each has its responsible, is completed field by field,
 * validated by the direction and transferred to the Production on its own.
 * The Conception is done when every sheet is transferred.
 */
export default async function DesignSheetsPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/sheets">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const step = ctx.steps[5];
  const views = await loadSheetViews(ctx);
  const canWrite =
    ctx.data.stage?.state === "in_progress" && !isLocked(step.status);
  return (
    <DesignStepFrame projectId={projectId} stepKey="sheets">
      {views.map((v) => (
        <SheetCard
          key={v.facts.sheet.id}
          ctx={ctx}
          view={v}
          canWrite={canWrite}
        />
      ))}
      <DesignWaits
        step={step}
        actors={ctx.journeySheets.map((s) => sheetAction(s, ctx))}
      />
    </DesignStepFrame>
  );
}
