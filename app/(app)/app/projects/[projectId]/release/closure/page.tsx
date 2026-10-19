import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { ClosureSection } from "@/components/distribution/closure-section";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.closure.title} · ${fr.app.name}`,
};

// Distribution › Clôture (lib/distribution/journey.ts).
export default async function DistributionClosurePage({
  params,
}: PageProps<"/app/projects/[projectId]/release/closure">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="closure">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="closure">
          <ClosureSection projectId={projectId} view={ctx.closure} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
