import { notFound } from "next/navigation";

import { RevisionButton } from "@/components/strategy/documents/revision-button";
import { ReservesList } from "@/components/strategy/documents/reserves-list";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { StrategyFeeds } from "@/components/strategy/validated/strategy-feeds";
import { StrategyDocumentRows } from "@/components/strategy/validated/strategy-document-rows";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { briefOutFrom, briefOutOf } from "@/lib/strategy/brief-out";
import { loadReserves } from "@/lib/strategy/execution-queries";
import { strategyStepData } from "@/lib/strategy/step-data";
import { upstreamChains } from "@/lib/strategy/upstream";
import { formatShortInstant } from "@/lib/utils/day";

/**
 * Stratégie › Stratégie validée (proto BODY_MK.st4, ticket § 10 to 14): the
 * validated Brief and the two documents to generate from it, what the
 * decisions feed — Conception, Activations, Planning — as three equal
 * consequences (nothing obliges to start the Conception), the reserves to
 * lift, the follow-up, and « Réviser la stratégie » (a V2, V1 kept).
 */
export default async function StrategyValidatedPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/validated">) {
  const { projectId } = await params;
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { approved, model, data, docs, isOwner, access } = ctx;
  const t = fr.strategyBriefOut.final;
  const out = approved
    ? (briefOutOf(approved.content) ?? briefOutFrom(model, data.referenceDate))
    : null;
  const reserves = approved ? await loadReserves(projectId, data.members) : [];
  const upstream =
    upstreamChains(
      data.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        occursOn: m.occurs_on,
        deliverableId: m.deliverable_id,
      })),
      data.deliverables,
      ctx.today,
    ).length * 3;
  const versions = Object.fromEntries(
    docs.documents.map((d) => [d.id, d.version]),
  );

  return (
    <StrategyStepFrame projectId={projectId} stepKey="validated">
      {approved && out && (
        <div className="flex flex-col gap-5">
          <ToneCallout tone="success" as="div">
            <span>
              <strong className="font-semibold">{t.callout}</strong>{" "}
              {t.calloutBody(
                formatShortInstant(approved.decidedAt ?? approved.createdAt),
                approved.version,
              )}
            </span>
          </ToneCallout>
          <StrategyDocumentRows
            projectId={projectId}
            approved={approved}
            documents={docs.documents}
          />
          <StrategyFeeds
            projectId={projectId}
            out={out}
            upstream={upstream}
            referenceDate={data.referenceDate}
          />
          <ReservesList
            projectId={projectId}
            reserves={reserves}
            versions={versions}
            meId={access.personId}
            isOwner={isOwner}
          />
          {isOwner && !docs.revisionOpen && (
            <div>
              <RevisionButton projectId={projectId} />
            </div>
          )}
        </div>
      )}
    </StrategyStepFrame>
  );
}
