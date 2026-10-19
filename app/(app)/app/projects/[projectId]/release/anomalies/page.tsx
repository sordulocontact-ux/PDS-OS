import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnomaliesSection } from "@/components/distribution/anomalies-section";
import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { JourneyBack } from "@/components/distribution/frame/journey-back";
import { platformLabel } from "@/lib/distribution/platforms";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.views.anomalies} · ${fr.app.name}`,
};

// Distribution › Anomalies, opened from the foot of the journey: what is
// wrong and the module where it is corrected; nothing is corrected here.
export default async function DistributionAnomaliesPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/anomalies">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId}>
      {(ctx) => (
        <div className="flex flex-col gap-3">
          <JourneyBack projectId={projectId} />
          <AnomaliesSection
            projectId={projectId}
            anomalies={ctx.anomalies}
            platforms={ctx.platforms.platforms.map((p) => ({
              key: p.platform,
              name: platformLabel(p),
            }))}
            firstMasterId={ctx.project.masters[0]?.id ?? null}
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
