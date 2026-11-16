// « Participations et contrats » of a collective's Juridique (lot 11 of
// docs/pds-mic-plan.md): one line per participation, its contract
// (title_participations.contract_id) and its deal (Business module), read
// under their rights; computed here, never stored. Pure: shared by the
// server and the client.

import { isActiveParticipation } from "@/lib/projects/participation-rules";
import type {
  BoardParticipation,
  BoardTitle,
  DealReach,
  ParticipationDeal,
} from "@/lib/projects/title-board-rules";

/** The deal's follow-up date has come while it is open: « à relancer »,
 * as the Deals page says it (lib/deals/filters.ts, followUpDue). */
export function followUpIsDue(
  deal: Pick<ParticipationDeal, "stage" | "followUpOn">,
  today: string,
): boolean {
  return (
    deal.followUpOn !== null &&
    deal.followUpOn <= today &&
    deal.stage !== "signed" &&
    deal.stage !== "abandoned"
  );
}

/**
 * « Ouvrir un dossier » on a participation: whoever may create a deal on
 * the project (create_deal: the direction or its owner), who reads all its
 * deals (never offered on a guess), for a participation still in play
 * (neither declined nor withdrawn, its title not abandoned) without a live
 * deal. `again`: its last deal was abandoned (« Ouvrir un nouveau
 * dossier »).
 */
export function openDealOffer(input: {
  canCreate: boolean;
  reach: DealReach;
  title: Pick<BoardTitle, "status">;
  participation: Pick<BoardParticipation, "status" | "deal">;
}): { again: boolean } | null {
  const { canCreate, reach, title, participation } = input;
  if (!canCreate || reach !== "all" || title.status === "abandoned")
    return null;
  if (!isActiveParticipation(participation.status)) return null;
  const deal = participation.deal;
  if (deal && deal.stage !== "abandoned") return null;
  return { again: deal !== null };
}

/**
 * The head's facts: the confirmed participations of live titles with their
 * contract signed, those in play without a live deal (only when the viewer
 * reads every deal: otherwise unknown), and the deals to follow up.
 */
export function trackingCounts(
  titles: BoardTitle[],
  reach: DealReach,
  today: string,
) {
  const live = titles
    .filter((title) => title.status !== "abandoned")
    .flatMap((title) => title.participations);
  const confirmed = live.filter((p) => p.status === "confirmed");
  return {
    confirmed: confirmed.length,
    signed: confirmed.filter(
      (p) => p.contract.kind === "contract" && p.contract.state === "signed",
    ).length,
    withoutDeal:
      reach === "all"
        ? live.filter(
            (p) =>
              isActiveParticipation(p.status) &&
              (!p.deal || p.deal.stage === "abandoned"),
          ).length
        : null,
    followUps: live.filter((p) => p.deal && followUpIsDue(p.deal, today))
      .length,
  };
}
