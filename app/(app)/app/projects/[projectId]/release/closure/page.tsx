import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ClosureStep,
  closureReturn,
} from "@/components/distribution/closure/closure-step";
import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { ReturnCallout } from "@/components/ui/return-callout";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";

const t = fr.distributionJourney;

export const metadata: Metadata = {
  title: `${t.steps.closure.title} · ${fr.app.name}`,
};

// Distribution › Clôture: normal, or with arbitrated reserves; validated.
export default async function DistributionClosurePage({
  params,
}: PageProps<"/app/projects/[projectId]/release/closure">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame projectId={projectId} shownKey="closure">
      {(ctx) => {
        const back = closureReturn(ctx);
        const current = ctx.closure.current;
        return (
          <DistributionStep
            ctx={ctx}
            stepKey="closure"
            badge={
              current?.status === "closed"
                ? current.kind === "reserves"
                  ? {
                      tone: "warning",
                      label: t.summary.closedReserves(current.reserves.length),
                    }
                  : { tone: "success", label: t.summary.closedNormal }
                : undefined
            }
            returned={
              back && ctx.closure.canEdit ? (
                <ReturnCallout
                  by={back.by}
                  outcome={t.dossier.returnedOutcome}
                  note={back.note}
                />
              ) : undefined
            }
          >
            <ClosureStep ctx={ctx} />
          </DistributionStep>
        );
      }}
    </DistributionFrame>
  );
}
