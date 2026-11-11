import "server-only";

import type { Access } from "@/lib/auth/access";
import { followUpDue } from "@/lib/deals/filters";
import { loadDealContract } from "@/lib/deals/memo-queries";
import type { DealContract } from "@/lib/deals/memos";
import { loadDeals } from "@/lib/deals/queries";
import type { Deal } from "@/lib/deals/types";

/** The deals of an artist the reader may see (BIZ 10), grouped as the
 * Deals page's views: to follow up, open, signed (the collaborations
 * done, still readable), abandoned; each with its contract. Never a
 * contact. */
export type ArtistDeals = {
  groups: {
    key: "follow-up" | "open" | "signed" | "abandoned";
    rows: Deal[];
  }[];
  contracts: Record<string, Pick<DealContract, "title" | "status">>;
  count: number;
};

export async function loadArtistDeals(
  access: Access,
  artistId: string,
  today: string,
): Promise<ArtistDeals> {
  const { deals } = await loadDeals(access);
  const mine = deals.filter((d) => d.artistId === artistId);
  const contracts = await Promise.all(
    mine.map(async (d) => [d.id, await loadDealContract(d.id)] as const),
  );
  const open = mine.filter(
    (d) => d.stage !== "signed" && d.stage !== "abandoned",
  );
  return {
    groups: [
      {
        key: "follow-up" as const,
        rows: open.filter((d) => followUpDue(d, today)),
      },
      {
        key: "open" as const,
        rows: open.filter((d) => !followUpDue(d, today)),
      },
      {
        key: "signed" as const,
        rows: mine.filter((d) => d.stage === "signed"),
      },
      {
        key: "abandoned" as const,
        rows: mine.filter((d) => d.stage === "abandoned"),
      },
    ].filter((g) => g.rows.length > 0),
    contracts: Object.fromEntries(
      contracts.flatMap(([id, c]) =>
        c ? [[id, { title: c.title, status: c.status }]] : [],
      ),
    ),
    count: mine.length,
  };
}
