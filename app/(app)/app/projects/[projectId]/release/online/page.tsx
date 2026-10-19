import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { AvailabilityCard } from "@/components/distribution/availability-card";
import { PlatformsSection } from "@/components/distribution/platforms-section";
import { isOpen } from "@/lib/distribution/anomalies";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.platforms.title} · ${fr.app.name}`,
};

// Distribution › Plateformes (lib/distribution/journey.ts).
export default async function DistributionPlatformsPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/online">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="platforms">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="platforms">
          <AvailabilityCard projectId={projectId} view={ctx.platforms} />
          <PlatformsSection
            projectId={projectId}
            platforms={ctx.platforms.platforms}
            anomalies={ctx.anomalies.filter(isOpen)}
            canEdit={ctx.platforms.canEdit}
            canCheck={ctx.platforms.canCheck}
          />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
