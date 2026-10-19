import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { DepositStep } from "@/components/distribution/deposit/deposit-steps";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

export const metadata: Metadata = {
  title: `${fr.distributionJourney.steps.deposit.title} · ${fr.app.name}`,
};

// Distribution › Dépôt dans The Orchard (lib/distribution/journey.ts).
export default async function DistributionDepositPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/deposit">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="deposit">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="deposit">
          <DepositStep ctx={ctx} />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
