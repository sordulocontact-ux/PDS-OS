import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { OrchardStep } from "@/components/distribution/deposit/deposit-steps";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.orchard.title} · ${fr.app.name}`,
};

// Distribution › Réponse de The Orchard (lib/distribution/journey.ts).
export default async function DistributionOrchardPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/orchard">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="orchard">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="orchard">
          <OrchardStep ctx={ctx} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
