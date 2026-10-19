import { notFound } from "next/navigation";

import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { ShootFilesSection } from "@/components/production/shoot/shoot-files-section";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { shootReport } from "@/lib/production/shoot/report";
import { shootFor } from "@/lib/production/tab-data";

export const metadata = {
  title: `${fr.productionJourney.steps.rushes.title} · ${fr.app.name}`,
};

/**
 * Rushes (proto « Projet complet », external production): the rushes'
 * link, their reception and the verified backup, declared apart from the
 * shoot — each a person's word, stamped by the database, never a check of
 * the files.
 */
export default async function ProductionRushesPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/rushes">) {
  const { projectId, deliverableId } = await params;
  const { access, data, step, steps } = await stepContext(
    projectId,
    deliverableId,
    "rushes",
  );
  const sheet = data.sheet;
  const shootData = await shootFor(projectId, deliverableId, access);
  if (!sheet || !shootData) notFound();
  const report = shootReport(
    shootData.shoot,
    shootData.incidents,
    shootData.equipment,
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      <ShootFilesSection
        projectId={projectId}
        sheetId={sheet.id}
        canOrganize={data.canOrganize}
        shoot={shootData.shoot}
        blockers={report.postBlockers}
        members={data.members}
        contacts={data.contacts}
      />
    </ProductionStepPanel>
  );
}
