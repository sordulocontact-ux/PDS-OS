import { MasterFactAction } from "@/components/master-workflow/master-fact-action";
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
 * mix and mastering. Each row leads to
 * the page where the fact lives (Audio, Fichiers, Sessions, Crédits of the
 * title, contact); what is missing is completed with the forms of those
 * pages. Each section sits on its own white card, the tiles stay outside
 * (docs/DESIGN.md, « Cartes de section »). A tile filters the page to its
 * facts (`state`): only the sections that hold some. The engineers of the
 * Réseau are chosen in the Brief, which shows their card and history.
 */
export function MasterInventory({
  inventory,
  basePath,
  state,
  lead,
}: {
  inventory: Inventory;
  // Between the header and the tiles: where the preparation stands (the
  // « Préparer » step).
  lead?: React.ReactNode;
  // The page's URL, for the tiles' filters.
  basePath: string;
  state: FactStatus | null;
}) {
  const t = fr.masterWorkflow.inventory;
  const sections = filterFactSections(inventory.sections, state).filter(
    (section) => !state || section.failed || section.facts.length > 0,
  );
  return (
    <div className="grid gap-8">
      {lead}

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
