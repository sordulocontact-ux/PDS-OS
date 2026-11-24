import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { todayInParis } from "@/lib/insights/dates";

const t = deals.work;

/** A deal's action for the global Travail and the home (BIZ 4). */
export type DealWork = {
  deal: Deal;
  // A decision of the direction, or the assignee's move.
  kind: "validate" | "deal";
  title: string;
  due: string | null;
  overdue: boolean;
};

/** The assignee's move on one of his open deals: a follow-up whose date has
 * come first, then the next action, a follow-up to come, the stage's own
 * move. Nothing while the direction decides the accord de principe. */
function moveOf(deal: Deal, today: string): DealWork | null {
  if (deal.stage === "agreement" && deal.agreementStatus === "pending")
    return null;
  const at = (title: string, due: string | null): DealWork => ({
    deal,
    kind: "deal",
    title,
    due,
    overdue: due !== null && due < today,
  });
  // Its reminder's day come: the action itself when there is one (one date
  // since the UX test of 24/11/2026), else « Relancer ».
  if (deal.followUpOn && deal.followUpOn <= today)
    return at(deal.nextAction ?? t.followUp, deal.followUpOn);
  if (deal.nextAction) return at(deal.nextAction, deal.nextActionOn);
  if (deal.followUpOn) return at(t.followUp, deal.followUpOn);
  return at(t.todo[deal.stage] ?? t.followUp, null);
}

/**
 * What the reader's deals ask of him, computed by code from the deals
 * (never stored): the accords de principe to validate for the direction,
 * one move per open deal assigned to him for a negotiator. The direction
 * does not get every deal's next action: they are their assignees'.
 */
export async function loadMyDealWork(
  access: Access,
): Promise<{ items: DealWork[]; error: boolean }> {
  // Only the direction and the negotiators have deals' actions.
  if (!can(access, "validate") && !can(access, "negotiate"))
    return { items: [], error: false };
  const { deals: all, error } = await loadDeals(access);
  const today = todayInParis();
  const items = all.flatMap((deal): DealWork[] => {
    if (deal.canDecide)
      return [
        {
          deal,
          kind: "validate",
          title: t.decideOf(deal.artistName ?? dealName(deal)),
          due: null,
          overdue: false,
        },
      ];
    const mine =
      deal.canWrite &&
      access.personId !== null &&
      deal.assignee?.id === access.personId;
    const move = mine ? moveOf(deal, today) : null;
    return move ? [move] : [];
  });
  return { items, error };
}
