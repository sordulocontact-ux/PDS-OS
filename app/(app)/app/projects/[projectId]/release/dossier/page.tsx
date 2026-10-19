import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { DossierReturn } from "@/components/distribution/dossier/dossier-return";
import {
  DossierStep,
  dossierReturn,
} from "@/components/distribution/dossier/dossier-step";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.dossier.title} · ${fr.app.name}`,
};

// Distribution › Dossier de livraison: the document, the six checks, then
// its submission and its decision on the evidence.
export default async function DistributionDossierPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/dossier">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="dossier">
      {(ctx) => {
        const back = dossierReturn(ctx);
        return (
          <DistributionStep
            ctx={ctx}
            stepKey="dossier"
            returned={
              back && ctx.view.canEdit ? (
                <DossierReturn
                  projectId={projectId}
                  firstMasterId={ctx.project.masters[0]?.id ?? null}
                  {...back}
                />
              ) : undefined
            }
          >
            <DossierStep ctx={ctx} />
          </DistributionStep>
        );
      }}
    </DistributionFrame>
  );
}
