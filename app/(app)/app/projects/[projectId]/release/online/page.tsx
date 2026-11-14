import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { PlatformsStep } from "@/components/distribution/platforms/platforms-step";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";
import { releaseParamOf } from "@/lib/distribution/scope";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.platforms.title} · ${fr.app.name}`,
};

// Distribution › Plateformes (lib/distribution/journey.ts).
export default async function DistributionPlatformsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release/online">) {
  const { projectId } = await params;
  // A collective's release (lot 15).
  const releaseId = releaseParamOf(await searchParams);
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame
      projectId={projectId}
      releaseId={releaseId}
      shownKey="platforms"
    >
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="platforms">
          <PlatformsStep ctx={ctx} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
