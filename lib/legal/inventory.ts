import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/contracts/types";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { unlinkedCreditsByName } from "@/lib/facts/credit-contact";
import { peopleFacts } from "@/lib/legal/people-facts";
import { agreementFacts, flagFacts } from "@/lib/legal/project-facts";
import {
  declarationFacts,
  splitFacts,
  titleFacts,
  titleRow,
  type InventoryMaster,
} from "@/lib/legal/title-facts";
import {
  countFacts,
  type LegalFact,
  type LegalInventory,
  type LegalSection,
  type LegalSectionKey,
} from "@/lib/legal/types";

/**
 * The État des lieux of a project, ready to display: one section per legal
 * area, every fact classified by code. Splits appear only for a viewer who
 * may read them (manage_catalog).
 */
export async function loadLegalInventory(
  project: { id: string; masters: Array<{ id: string; artists: string }> },
  access: Access,
): Promise<LegalInventory> {
  // manage_catalog reads the splits and writes everything of a title
  // (credits, shares, rights, declarations). The database checks it again.
  const readSplits = can(access, "manage_catalog");
  const canEditCatalog = readSplits;
  const rows = await readInventoryRows(project.id, project.masters, readSplits);
  const titles = rows.titles.map(titleRow);

  const perTitle = (build: (master: InventoryMaster) => LegalFact[]) =>
    rows.titles.flatMap(build);
  const section = (key: LegalSectionKey, facts: LegalFact[]): LegalSection => {
    const failed = rows.failed[key] ?? false;
    return { key, facts: failed ? [] : facts, failed };
  };

  const sameName = unlinkedCreditsByName(
    [...rows.creditsOf].flatMap(([masterId, credits]) =>
      credits.map((credit) => ({ ...credit, masterId })),
    ),
  );

  const sections: LegalSection[] = [
    section("titles", titles.flatMap(titleFacts)),
    section(
      "people",
      perTitle((master) =>
        peopleFacts(
          master,
          rows.performersOf.get(master.id) ?? [],
          rows.creditsOf.get(master.id) ?? [],
          rows.network,
          { addToNetwork: can(access, "manage_network"), link: canEditCatalog },
          sameName,
        ),
      ),
    ),
    ...(readSplits
      ? [
          section(
            "splits",
            perTitle((master) =>
              splitFacts(
                master,
                rows.splitsOf.get(master.id) ?? [],
                canEditCatalog,
              ),
            ),
          ),
        ]
      : []),
    section(
      "agreements",
      agreementFacts(rows.contracts, todayInParis(new Date())),
    ),
    section(
      "declarations",
      perTitle((master) =>
        declarationFacts(
          master,
          rows.filedOf.get(master.id) ?? new Map(),
          canEditCatalog,
        ),
      ),
    ),
    section("flags", flagFacts(project.id, rows.flags)),
  ];

  return {
    sections,
    titles: rows.failed.titles ? [] : titles,
    projectId: project.id,
    canEditCatalog: canEditCatalog && titles.length > 0,
    canCreateContract: can(access, "manage_contracts"),
    declared: Object.fromEntries(
      rows.titles.map((master) => [
        master.id,
        [...(rows.filedOf.get(master.id)?.keys() ?? [])],
      ]),
    ),
    counts: countFacts(sections),
  };
}
