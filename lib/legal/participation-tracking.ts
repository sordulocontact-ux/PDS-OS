import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/contracts/types";
import { canEditProject } from "@/lib/projects/edit-access";
import { loadTitleBoard } from "@/lib/projects/title-board";
import type { BoardTitle, DealReach } from "@/lib/projects/title-board-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type ParticipationTracking = {
  titles: BoardTitle[];
  dealReach: DealReach;
  // create_deal: the direction or the project's owner.
  canCreate: boolean;
  // Who may negotiate a deal (list_deal_negotiators), for « Ouvrir un
  // dossier »; empty when the viewer may not create one.
  negotiators: Array<{ id: string; name: string }>;
  today: string;
};

/**
 * « Participations et contrats » of a collective's Juridique (lot 11): the
 * participations of « Titres et artistes » (loadTitleBoard: contract on
 * title_participations.contract_id, deal by deals.participation_id, both
 * read with the viewer's session, never a contact), and who may open a
 * deal. Nothing is created or copied from the Business module: its deals
 * are read, and opened by its own create_deal.
 */
export async function loadParticipationTracking(
  project: { id: string; ownerPersonId: string | null },
  access: Access,
): Promise<ParticipationTracking> {
  const canCreate = can(access, "validate") || canEditProject(access, project);
  const [board, negotiators] = await Promise.all([
    loadTitleBoard(project, access),
    canCreate ? loadNegotiators() : Promise.resolve([]),
  ]);
  return {
    titles: board.titles,
    dealReach: board.dealReach,
    canCreate,
    negotiators,
    today: todayInParis(new Date()),
  };
}

async function loadNegotiators() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_deal_negotiators");
  if (error) console.error("loadNegotiators:", error.message);
  return (data ?? []).map((row) => ({
    id: row.person_id,
    name: personName(row.first_name, row.last_name),
  }));
}
