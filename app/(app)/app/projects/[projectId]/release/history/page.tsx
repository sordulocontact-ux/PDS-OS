import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionHistory } from "@/components/distribution/distribution-history";
import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { JourneyBack } from "@/components/distribution/frame/journey-back";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.views.history} · ${fr.app.name}`,
};

// Distribution › Historique, opened from the foot of the journey: every
// gesture, who and when, with or without proof; nothing is ever removed.
export default async function DistributionHistoryPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/history">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId}>
      {(ctx) => (
        <div className="flex flex-col gap-3">
          <JourneyBack projectId={projectId} />
          <DistributionHistory
            closures={ctx.closure.closures}
            events={ctx.closure.events}
          />
        </div>
      )}
    </DistributionFrame>
  );
}
