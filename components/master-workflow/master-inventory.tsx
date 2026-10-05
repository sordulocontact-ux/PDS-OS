import { MasterFactAction } from "@/components/master-workflow/master-fact-action";
import { NetworkEngineersTable } from "@/components/master-workflow/network-engineers-table";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactTable } from "@/components/ui/fact-table";
import { StatTiles } from "@/components/ui/stat-tiles";
import type { FactStatus } from "@/lib/facts/types";
import { factTiles, filterFactSections } from "@/lib/facts/views";
import { fr } from "@/lib/i18n/fr";
import type {
  MasterInventory as Inventory,
  MasterSection,
} from "@/lib/master-workflow/types";

/**
 * The Master's first step: what the project's titles already hold for their
 * mix and mastering, then the engineers of the Réseau. Each row leads to
 * the page where the fact lives (Audio, Fichiers, Sessions, Crédits of the
 * title, contact); what is missing is completed with the forms of those
 * pages. Each section sits on its own white card, the tiles stay outside
 * (docs/DESIGN.md, « Cartes de section »). A tile filters the page to its
 * facts (`state`): only the sections that hold some, without the Réseau.
 */
export function MasterInventory({
  inventory,
  basePath,
  state,
}: {
  inventory: Inventory;
  // The page's URL, for the tiles' filters.
  basePath: string;
  state: FactStatus | null;
}) {
  const t = fr.masterWorkflow.inventory;
  const network = t.network;
  const sections = filterFactSections(inventory.sections, state).filter(
    (section) => !state || section.failed || section.facts.length > 0,
  );
  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />

      {inventory.hasTitles ? (
        <>
          <StatTiles
            columns={3}
            stats={factTiles(inventory.counts, t.counts, basePath, state)}
          />

          {state && sections.length === 0 && (
            <EmptyNote>{t.noneOfState[state]}</EmptyNote>
          )}
          {sections.map((section) => (
            <PageSection
              key={section.key}
              id={`master-${section.key}`}
              title={t.sections[section.key].title}
              description={t.sections[section.key].description}
              card
            >
              <SectionBody
                section={section}
                organizationId={inventory.organizationId}
              />
            </PageSection>
          ))}
        </>
      ) : (
        <EmptyNote>{t.noTitles}</EmptyNote>
      )}

      {!state && (
        <PageSection
          id="master-network"
          title={network.title}
          description={network.description}
          card
          action={
            inventory.canAddContact &&
            !inventory.engineers.failed && (
              <AddToNetworkButton
                header
                label={network.add}
                action={{
                  kind: "add_to_network",
                  name: "",
                  roles: ["engineer"],
                  links: [],
                }}
              />
            )
          }
        >
          {inventory.engineers.failed ? (
            <EmptyNote>{fr.facts.failed}</EmptyNote>
          ) : inventory.engineers.rows.length === 0 ? (
            <EmptyNote>{network.empty}</EmptyNote>
          ) : (
            <NetworkEngineersTable engineers={inventory.engineers.rows} />
          )}
        </PageSection>
      )}
    </div>
  );
}

// Every title has at least one fact per section: a section is empty only
// if the project has no title, which the page says once instead.
function SectionBody({
  section,
  organizationId,
}: {
  section: MasterSection;
  organizationId: string | null;
}) {
  if (section.failed) return <EmptyNote>{fr.facts.failed}</EmptyNote>;
  if (section.facts.length === 0)
    return <EmptyNote>{fr.facts.noMasters}</EmptyNote>;
  return (
    <FactTable
      facts={section.facts}
      renderAction={(action) => (
        <MasterFactAction action={action} organizationId={organizationId} />
      )}
    />
  );
}
