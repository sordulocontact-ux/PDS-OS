"use client";

import { ProposalRow } from "@/components/ui/proposal-row";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import { decideStrategyLine } from "@/lib/strategy/actions/lines";
import type { DimItem } from "@/lib/strategy/dimension-items";

const fr = { strategyDimensions };

const t = fr.strategyDimensions.done;

/**
 * A line of « Les 8 dimensions » (proto itemRow) on the common
 * `ProposalRow`: Confirmer / Modifier / Écarter, the toast said with the
 * verb of the button (« Retenu », « Modifié et retenu », « Écarté »).
 * `confirmInGroup`: confirmed with the others of its dimension.
 */
export function StrategyLine({
  projectId,
  item,
  canEdit,
  confirmInGroup = false,
}: {
  projectId: string;
  item: DimItem;
  canEdit: boolean;
  confirmInGroup?: boolean;
}) {
  return (
    <ProposalRow
      proposal={item.proposal}
      canEdit={canEdit}
      confirmInGroup={confirmInGroup}
      onConfirm={(text) =>
        decideStrategyLine(projectId, item.target, true, text)
      }
      onDiscard={() => decideStrategyLine(projectId, item.target, false)}
      messages={{ confirmed: t.kept, discarded: t.discarded, saved: t.saved }}
    />
  );
}
