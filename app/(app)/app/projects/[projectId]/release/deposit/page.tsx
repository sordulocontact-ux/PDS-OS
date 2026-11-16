import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { DepositStep } from "@/components/distribution/deposit/deposit-steps";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";
import { releaseParamOf } from "@/lib/distribution/scope";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.deposit.title} · ${fr.app.name}`,
};

// Distribution › Dépôt dans The Orchard (lib/distribution/journey.ts).
export default async function DistributionDepositPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release/deposit">) {
  const { projectId } = await params;
  // A collective's release (lot 15).
  const releaseId = releaseParamOf(await searchParams);
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame
      projectId={projectId}
      releaseId={releaseId}
      shownKey="deposit"
    >
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="deposit">
          <DepositStep ctx={ctx} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
