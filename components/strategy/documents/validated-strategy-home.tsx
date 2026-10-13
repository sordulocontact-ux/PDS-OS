import { PageSection } from "@/components/shell/page-section";
import { ConceptionNextStep } from "@/components/strategy/documents/conception-next-step";
import { ReservesList } from "@/components/strategy/documents/reserves-list";
import { ValidatedStrategy } from "@/components/strategy/documents/validated-strategy";
import { fr } from "@/lib/i18n/fr";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import type { DimensionStatus } from "@/lib/strategy/dimensions";
import type { StrategyReserve } from "@/lib/strategy/execution-queries";

/**
 * The Stratégie page once validated (MKT-C2-01): where it stands, the one
 * next action (« Passer à la conception ») above the documents, the open
 * reserves until lifted, then the eight dimensions — `children`, the
 * pilotage — folded under « Consulter la stratégie validée », summed up by
 * state so that a missing answer never reads as decided. Unfolded when a
 * dimension is asked (?d=).
 */
export function ValidatedStrategyHome({
  projectId,
  version,
  documents,
  isOwner,
  meId,
  designState,
  deliverableCount,
  reserves,
  statuses,
  dimensionOpen,
  children,
}: {
  projectId: string;
  // The reference Brief's version.
  version: number;
  documents: StrategyDocument[];
  isOwner: boolean;
  meId: string | null;
  // The Conception stage's state, as stored.
  designState: string;
  deliverableCount: number;
  reserves: StrategyReserve[];
  statuses: DimensionStatus[];
  dimensionOpen: boolean;
  children: React.ReactNode;
}) {
  const t = fr.strategyDocuments.consult;
  const counts = { complete: 0, to_decide: 0, to_complete: 0, in_progress: 0 };
  for (const d of statuses) counts[d.state] += 1;
  return (
    <>
      <ValidatedStrategy
        projectId={projectId}
        version={version}
        documents={documents}
        canShare={isOwner}
        next={
          <ConceptionNextStep
            projectId={projectId}
            designState={designState}
            isOwner={isOwner}
            deliverableCount={deliverableCount}
            briefVersion={version}
          />
        }
        reserves={
          reserves.some((r) => r.status === "open") && (
            <ReservesList
              projectId={projectId}
              reserves={reserves}
              versions={Object.fromEntries(
                documents.map((d) => [d.id, d.version]),
              )}
              meId={meId}
              isOwner={isOwner}
            />
          )
        }
      />
      <PageSection
        id="validated-dimensions"
        title={t.title}
        description={t.summary(counts)}
        collapsible
        defaultOpen={dimensionOpen}
      >
        {children}
      </PageSection>
    </>
  );
}
