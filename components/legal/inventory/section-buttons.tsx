import { NewContractButton } from "@/components/contracts/new-contract-button";
import { AddContributorButton } from "@/components/legal/add-contributor-button";
import { DeclareButton } from "@/components/legal/declare-button";
import { AddProjectContactButton } from "@/components/legal/project-contact-controls";
import type { LegalInventory } from "@/lib/legal/types";

/** What the viewer may add to the file, under the list of facts. */
export function SectionButtons({ inventory }: { inventory: LegalInventory }) {
  const titles = inventory.titles.map((row) => ({
    id: row.masterId,
    title: row.title,
  }));
  const failed = (key: string) =>
    inventory.sections.find((s) => s.key === key)?.failed;
  return (
    <div className="flex flex-wrap gap-2">
      {inventory.canEditCatalog && !failed("people") && (
        <AddContributorButton titles={titles} />
      )}
      {inventory.canCreateContract && !failed("agreements") && (
        <NewContractButton projectId={inventory.projectId} />
      )}
      {inventory.canEditCatalog && !failed("declarations") && (
        <DeclareButton titles={titles} declared={inventory.declared} />
      )}
      <AddProjectContactButton projectId={inventory.projectId} />
    </div>
  );
}
