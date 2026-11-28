import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistributionFrame } from "@/components/distribution/frame/distribution-frame";
import { DistributionStep } from "@/components/distribution/frame/distribution-step";
import { PrepStep } from "@/components/distribution/steps/prep-step";
import { fr } from "@/lib/i18n/fr";
import { isUuid } from "@/lib/release/uuid";
import { releaseParamOf } from "@/lib/distribution/scope";
import { routes } from "@/lib/auth/redirects";
import { LEGAL_READY_KEY } from "@/lib/ui/legal-steps";
import { distributionPreparationTone } from "@/lib/ui/state-tones";

const t = fr.distributionJourney;

export const metadata: Metadata = {
  title: `${t.steps.prep.title} · ${fr.app.name}`,
};

// Distribution › Préparation: what the deposit reuses, read at its source.
export default async function DistributionPreparationPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/release/preparation">) {
  const { projectId } = await params;
  // A collective's release (lot 15).
  const releaseId = releaseParamOf(await searchParams);
  if (!isUuid(projectId)) notFound();
  return (
    <DistributionFrame
      projectId={projectId}
      releaseId={releaseId}
      shownKey="prep"
    >
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
            legal={{
              value:
                ctx.legal.allowed && ctx.legal.readiness
                  ? ctx.legal.readiness.verdict === "no"
                    ? fr.legalReadiness.verdictBody.no(
                        ctx.legal.readiness.blocking.length,
                      )
                    : fr.legalReadiness.verdictBody[ctx.legal.readiness.verdict]
                  : t.legalReady.restricted,
              source: ctx.legalReady.source ?? "",
              done: ctx.legalReady.done,
              href: ctx.legal.allowed
                ? routes.projectLegalStep(projectId, LEGAL_READY_KEY)
                : null,
            }}
          />
        </DistributionStep>
      )}
    </DistributionFrame>
  );
}
