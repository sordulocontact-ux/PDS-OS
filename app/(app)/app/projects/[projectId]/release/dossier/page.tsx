import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { ChecksSection } from "@/components/distribution/checks-section";
import { DossierSections } from "@/components/distribution/dossier-sections";
import { ValidationSection } from "@/components/distribution/validation-section";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.dossier.title} · ${fr.app.name}`,
};

// Distribution › Dossier de livraison (lib/distribution/journey.ts).
export default async function DistributionDossierPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/dossier">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="dossier">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="dossier">
          <ValidationSection projectId={projectId} view={ctx.view} />
          <ChecksSection
            projectId={projectId}
            checks={ctx.view.checks}
            canCheck={ctx.view.canCheck}
          />
          <DossierSections sections={ctx.view.sections} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
