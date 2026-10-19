"use client";

import { ProposalRow } from "@/components/ui/proposal-row";
import { fr } from "@/lib/i18n/fr";
import { decideStrategyLine } from "@/lib/strategy/actions/lines";
import type { DimItem } from "@/lib/strategy/dimension-items";

const t = fr.strategyDimensions.done;

/**
 * A line of « Les 8 dimensions » (proto itemRow) on the common
 * `ProposalRow`: Confirmer / Modifier / Écarter, the toast said with the
 * verb of the button (« Retenu », « Modifié et retenu », « Écarté »).
 */
export function StrategyLine({
  projectId,
  item,
  canEdit,
}: {
  projectId: string;
  item: DimItem;
  canEdit: boolean;
}) {
  return (
    <ProposalRow
      proposal={item.proposal}
      canEdit={canEdit}
      onConfirm={(text) =>
        decideStrategyLine(projectId, item.target, true, text)
      }
      onDiscard={() => decideStrategyLine(projectId, item.target, false)}
      messages={{ confirmed: t.kept, discarded: t.discarded, saved: t.saved }}
    />
  );
}
