import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnomaliesSection } from "@/components/distribution/anomalies-section";
import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { JourneyBack } from "@/components/distribution/frame/journey-back";
import { platformLabel } from "@/lib/distribution/platforms";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";
import { releaseParamOf } from "@/lib/distribution/scope";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.views.anomalies} · ${fr.app.name}`,
};

// Distribution › Anomalies, opened from the foot of the journey: what is
// wrong and the module where it is corrected; nothing is corrected here.
export default async function DistributionAnomaliesPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release/anomalies">) {
  const { projectId } = await params;
  // A collective's release (lot 15).
  const releaseId = releaseParamOf(await searchParams);
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} releaseId={releaseId}>
      {(ctx) => (
        <div className="flex flex-col gap-3">
          <JourneyBack projectId={projectId} releaseId={releaseId} />
          <AnomaliesSection
            projectId={projectId}
            anomalies={ctx.anomalies}
            platforms={ctx.platforms.platforms.map((p) => ({
              key: p.platform,
              name: platformLabel(p),
            }))}
            firstMasterId={ctx.project.masters[0]?.id ?? null}
            releaseId={ctx.releaseId}
            uncheckedChecks={
              ctx.view.checks.filter((c) => c.result === "unchecked").length
            }
            canCheck={ctx.platforms.canCheck}
          />
        </div>
      )}
    </DistributionFrame>
  );
}
