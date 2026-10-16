import { NewContractButton } from "@/components/contracts/new-contract-button";
import { AddContributorButton } from "@/components/legal/add-contributor-button";
import { DeclareButton } from "@/components/legal/declare-button";
import { FactAction } from "@/components/legal/fact-action";
import { LegalTitlesTable } from "@/components/legal/legal-titles-table";
import { ProjectContactsSection } from "@/components/legal/project-contacts-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { fr } from "@/lib/i18n/fr";
import type { FactStatus } from "@/lib/facts/types";
import { filterFactSections } from "@/lib/facts/views";
import type {
  LegalInventory as Inventory,
  LegalSection,
} from "@/lib/legal/types";

/**
 * Juridique's first step: what the project already knows, read only. Each
 * row leads to the page where the fact is completed (title, network,
 * contract, Cadrage); nothing is written here. Each section sits on its
 * own white card, the tiles stay outside (docs/DESIGN.md, « Cartes de
 * section »).
 */
export function LegalInventory({
  inventory: all,
  state,
}: {
  inventory: Inventory;
  // `?state=`: the tile clicked, only its facts shown (lib/facts/views.ts,
  // as on the État du master). The counts stay those of the whole dossier.
  state: FactStatus | null;
}) {
  const t = fr.legal.inventory;
  const inventory: Inventory = state
    ? {
        ...all,
        // A section with nothing of that status is left out while filtered.
        sections: filterFactSections(all.sections, state).filter(
          (section) => section.failed || section.facts.length > 0,
        ),
        titles: all.titles.filter((row) =>
          Object.values(row.cells).some((cell) => cell.status === state),
        ),
      }
    : all;
  // « Points signalés au cadrage » are what the Cadrage juridique asks about.
  const sections = inventory.sections.filter((s) => s.key !== "flags");
  return (
    <div className="grid gap-8">
      {state && sections.length === 0 && (
        <EmptyNote>{t.filterEmpty[state]}</EmptyNote>
      )}
      {sections.map((section) => (
        <PageSection
          key={section.key}
          id={`legal-${section.key}`}
          title={t.sections[section.key].title}
          card
          action={<SectionAction section={section} inventory={inventory} />}
        >
          <SectionBody section={section} inventory={inventory} />
        </PageSection>
      ))}
      {/* Not a fact of the dossier: hidden while a tile filters it. */}
      {!state && (
        <ProjectContactsSection
          projectId={all.projectId}
          contacts={all.projectContacts}
        />
      )}
    </div>
  );
}

// What a section's header offers, when the viewer may: credit someone,
// declare a filing, create a contract attached to the project.
function SectionAction({
  section,
  inventory,
}: {
  section: LegalSection;
  inventory: Inventory;
}) {
  const titles = inventory.titles.map((row) => ({
    id: row.masterId,
    title: row.title,
  }));
  if (section.failed) return null;
  if (section.key === "people" && inventory.canEditCatalog)
    return <AddContributorButton titles={titles} />;
  if (section.key === "declarations" && inventory.canEditCatalog)
    return <DeclareButton titles={titles} declared={inventory.declared} />;
  if (section.key === "agreements" && inventory.canCreateContract)
    return <NewContractButton projectId={inventory.projectId} />;
  return null;
}

// A title-based section is empty only when the project has no title; the
// agreements always hold at least the "no contract" fact. Titres has its own
// layout: one row per title, identifiers in columns.
function SectionBody({
  section,
  inventory,
}: {
  section: LegalSection;
  inventory: Inventory;
}) {
  if (section.failed) return <EmptyNote>{fr.facts.failed}</EmptyNote>;
  if (section.facts.length === 0)
    return <EmptyNote>{fr.facts.noMasters}</EmptyNote>;
  if (section.key === "titles")
    return (
      <LegalTitlesTable
        titles={inventory.titles}
        canEdit={inventory.canEditCatalog}
      />
    );
  return (
    <FactTable
      facts={section.facts}
      renderAction={(action) => <FactAction action={action} />}
    />
  );
}
