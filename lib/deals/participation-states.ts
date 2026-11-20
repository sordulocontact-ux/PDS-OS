import "server-only";

import { isDealStage, type DealStage } from "@/lib/deals/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a participation's deal stands (Ibé 18/11/2026: the call of
 * negotiation, then the accord validated by the direction, before any
 * contract), for the « Titres et artistes » board's « Taux / accord »
 * column and its « Caler le call » button. Computed by the database
 * (project_participation_deal_states, for whoever sees the project): its
 * live deal, else its latest abandoned one, else none.
 */
export type ParticipationDealState = {
  dealId: string | null;
  stage: DealStage | null;
  // The accord de principe validated by the direction: the contracts may go.
  agreementValidated: boolean;
  // The next call still to hold, the latest one held.
  nextCallAt: string | null;
  lastCallAt: string | null;
  // The reader may « Caler le call » (NegotiationCallButton): on the deal,
  // or on the participation when it has none (the gesture opens it).
  canPlanCall: boolean;
};

/** Every participation of a project, by its id. */
export async function loadParticipationDealStates(
  projectId: string,
): Promise<Map<string, ParticipationDealState>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "project_participation_deal_states",
    { p_project_id: projectId },
  );
  if (error) console.error("loadParticipationDealStates:", error.message);
  return new Map(
    (data ?? []).map((row) => [
      row.participation_id,
      {
        dealId: row.deal_id,
        stage: isDealStage(row.stage) ? row.stage : null,
        agreementValidated: row.agreement_validated,
        nextCallAt: row.next_call_at,
        lastCallAt: row.last_call_at,
        canPlanCall: row.can_plan_call,
      },
    ]),
  );
}
