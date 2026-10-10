import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  networkIndex,
  unlinkedCreditsByName,
} from "@/lib/facts/credit-contact";
import { countFacts } from "@/lib/facts/types";
import { engineerFacts } from "@/lib/master-workflow/engineer-facts";
import { readMasterRows } from "@/lib/master-workflow/inventory-rows";
import { networkEngineers } from "@/lib/master-workflow/network-engineers";
import {
  materialFacts,
  sourceFacts,
  type FlowTitle,
} from "@/lib/master-workflow/source-facts";
import type {
  MasterFact,
  MasterInventory,
  MasterSection,
  MasterSectionKey,
} from "@/lib/master-workflow/types";
import { canEditProject } from "@/lib/projects/edit-access";

/**
 * The État du master of a project, ready to display: what its titles hold
 * for their mix and mastering, every fact classified by code. Read-only; each action opens the form of the
 * record's own page, whose permission the server checks here first
 * (manage_catalog for a title, manage_network for a contact) and the
 * database again.
 */
export async function loadMasterInventory(
  project: {
    id: string;
    ownerPersonId: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<MasterInventory> {
  const canEditCatalog = can(access, "manage_catalog");
  const canAddContact = can(access, "manage_network");
  const rows = await readMasterRows(project.id, project.masters);
  const context = {
    network: networkIndex(rows.contacts),
    engineersInNetwork: networkEngineers(rows.contacts, rows.linkedCredits)
      .length,
    rights: { addToNetwork: canAddContact, link: canEditCatalog },
    sameName: unlinkedCreditsByName(
      [...rows.creditsOf].flatMap(([masterId, credits]) =>
        credits.map((credit) => ({ ...credit, masterId })),
      ),
    ),
    framing: rows.framingEngineers,
    framingHref: routes.projectFramingStep(project.id, "team"),
  };

  const perTitle = (build: (title: FlowTitle) => MasterFact[]) =>
    rows.titles.flatMap(build);
  const section = (
    key: MasterSectionKey,
    facts: MasterFact[],
  ): MasterSection => {
    const failed = rows.failed[key] ?? false;
    return { key, facts: failed ? [] : facts, failed };
  };

  const sections = [
    section(
      "sources",
      perTitle((title) =>
        sourceFacts(
          title,
          rows.audioOf.get(title.id) ?? [],
          rows.sourceOf.get(title.id) ?? null,
          rows.sessionsOf.get(title.id) ?? [],
          {
            projectId: project.id,
            addAudio: canEditCatalog,
            // Only the owner writes in a launched project (is_project_owner).
            confirm: canEditProject(access, project),
          },
        ),
      ),
    ),
    section(
      "materials",
      perTitle((title) =>
        materialFacts(title, rows.stemsOf.get(title.id) ?? 0, canEditCatalog),
      ),
    ),
    section(
      "engineers",
      perTitle((title) =>
        engineerFacts(
          title,
          rows.creditsOf.get(title.id) ?? [],
          rows.sessionsOf.get(title.id) ?? [],
          context,
        ),
      ),
    ),
  ];

  return {
    hasTitles: rows.titles.length > 0,
    sections,
    counts: countFacts(sections),
    organizationId: canEditCatalog ? access.organizationId : null,
  };
}
