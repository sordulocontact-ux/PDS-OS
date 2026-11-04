import { NewContractButton } from "@/components/contracts/new-contract-button";
import { AddContributorButton } from "@/components/legal/add-contributor-button";
import { DeclareButton } from "@/components/legal/declare-button";
import { AddProjectContactButton } from "@/components/legal/project-contact-controls";
import type { LegalInventory } from "@/lib/legal/types";

export type InventorySectionKey =
  LegalInventory["sections"][number]["key"] | "contacts";

/** What the viewer may add to a section, under its list (null: nothing). */
export function sectionButton(
  inventory: LegalInventory,
  section: InventorySectionKey,
) {
  const titles = inventory.titles.map((row) => ({
    id: row.masterId,
    title: row.title,
  }));
  if (section === "people" && inventory.canEditCatalog)
    return <AddContributorButton titles={titles} />;
  if (section === "agreements" && inventory.canCreateContract)
    return <NewContractButton projectId={inventory.projectId} />;
  if (section === "declarations" && inventory.canEditCatalog)
    return <DeclareButton titles={titles} declared={inventory.declared} />;
  if (section === "contacts")
    return <AddProjectContactButton projectId={inventory.projectId} />;
  return null;
}
