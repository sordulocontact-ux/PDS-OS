import { Fold } from "@/components/ui/fold";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { isClosed } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";

import { ClearanceRequest } from "./clearance-request";
import { ClearanceStages, momentOf } from "./clearance-stages";
import { ExchangesTab } from "./exchanges-tab";
import { HistoryTab } from "./history-tab";
import { OtherWays } from "./other-ways";

const fr = { legalClearance };

/**
 * An authorisation's démarche (recette Juridique V1, JUR-09), read in the
 * order it is used (Sacha, 07/11/2026: « mal hiérarchisée, trop
 * d'informations ») — the gesture of the moment first (or its outcome once
 * closed), then « La demande » once asked (each right, its holder, its
 * state), then what stays folded: the journal and the other ways out.
 */
export function ClearanceBody({
  projectId,
  clearance,
  context,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
}) {
  const t = fr.legalClearance;
  const closed = isClosed(clearance.status);
  // While asking, the moment itself shows what is taken and who holds it.
  const asking = momentOf(clearance.status) === "ask";
  const journal = clearance.exchanges.length + clearance.history.length;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {closed && (
        <ToneCallout
          tone={clearance.status === "cleared" ? "success" : "neutral"}
        >
          {clearance.status === "cleared"
            ? t.stages.done.cleared
            : t.stages.done.abandoned}
        </ToneCallout>
      )}
      <ClearanceStages
        projectId={projectId}
        clearance={clearance}
        context={context}
      />
      {!asking && <ClearanceRequest clearance={clearance} />}
      {(journal > 0 || !closed) && (
        <div className="mt-3.5 flex flex-col gap-3">
          {journal > 0 && (
            <Fold summary={`${t.stages.journal} · ${journal}`}>
              {clearance.exchanges.length > 0 && (
                <ExchangesTab clearance={clearance} />
              )}
              {clearance.history.length > 0 && (
                <HistoryTab clearance={clearance} />
              )}
            </Fold>
          )}
          {!closed && (
            <OtherWays
              projectId={projectId}
              clearance={clearance}
              asking={asking}
            />
          )}
        </div>
      )}
    </div>
  );
}
