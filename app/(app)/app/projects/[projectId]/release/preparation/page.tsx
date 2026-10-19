import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { PrepStep } from "@/components/distribution/steps/prep-step";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";
import { distributionPreparationTone } from "@/lib/ui/state-tones";

const t = fr.distributionJourney;

export const metadata: Metadata = {
  title: `${t.steps.prep.title} · ${fr.app.name}`,
};

// Distribution › Préparation: what the deposit reuses, read at its source.
export default async function DistributionPreparationPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/preparation">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="prep">
      {(ctx) => (
        <DistributionStep
          ctx={ctx}
          stepKey="prep"
          badge={{
            tone: distributionPreparationTone[ctx.view.readiness.state],
            label: t.prep.badges[ctx.view.readiness.state],
          }}
        >
          <PrepStep
            readiness={ctx.view.readiness}
            failed={ctx.view.sources.failed}
          />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
