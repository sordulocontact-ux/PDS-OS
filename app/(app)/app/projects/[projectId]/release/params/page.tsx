import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { ParamsList } from "@/components/distribution/params/params-list";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

const t = fr.distributionJourney;

export const metadata: Metadata = {
  title: `${t.steps.params.title} · ${fr.app.name}`,
};

// Distribution › Paramètres de distribution: what belongs to the
// distribution itself, confirmed in one gesture.
export default async function DistributionParamsPage({
  params,
}: PageProps<"/app/projects/[projectId]/release/params">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="params">
      {(ctx) => (
        <DistributionStep ctx={ctx} stepKey="params">
          <ParamsList
            data={ctx.paramsData}
            confirm={ctx.view.sources.paramsConfirmed === null}
          />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
