import { FactAction } from "@/components/legal/fact-action";
import { InventoryRow } from "@/components/legal/inventory/inventory-row";
import {
  sectionButton,
  type InventorySectionKey,
} from "@/components/legal/inventory/section-buttons";
import { ProjectContactRow } from "@/components/legal/inventory/contact-row";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactRows } from "@/components/ui/fact-row";
import { facts } from "@/lib/i18n/fr/facts";
import { legal } from "@/lib/i18n/fr/legal";
import type { FactStatus } from "@/lib/facts/types";
import { filterFactSections } from "@/lib/facts/views";
import { isRowEdit, type LegalInventory as Inventory } from "@/lib/legal/types";

const fr = { facts, legal };

/**
 * Juridique's first step: what the project already knows, one section per
 * domain (proto Juridique v3, `inv()`): its title in ink, its facts as
 * joined rows (what it is, its source, its state, what to do), then what
 * may be added to it. Each row leads to the page where the fact lives.
 */
export function LegalInventory({
  inventory,
  state,
}: {
  inventory: Inventory;
  // `?state=`: only the facts of that state (lib/facts/views.ts).
  state: FactStatus | null;
}) {
  const t = fr.legal.inventory;
  // No title yet: the per-title sections are empty, but the project's
  // contracts and intervenants are still read and added here.
  const noTitles = inventory.titles.length === 0;
  // « Points signalés au cadrage » are what the Cadrage juridique asks about.
  const sections = filterFactSections(inventory.sections, state).filter(
    (s) =>
      s.key !== "flags" &&
      (s.failed ||
        s.facts.length > 0 ||
        (!state &&
          (!noTitles ||
            (s.key === "agreements" && inventory.canCreateContract)))),
  );
  // The title as a tag only when there are several to tell apart.
  const tagged = inventory.titles.length > 1;
  // A single title is the project itself: never repeated on its rows.
  const titleNames = new Set(inventory.titles.map((row) => row.title));

  if (state && sections.length === 0)
    return <EmptyNote>{t.filterEmpty[state]}</EmptyNote>;

  return (
    <>
      {noTitles && !state && !sections.some((s) => s.failed) && (
        <EmptyNote>{fr.facts.noMasters}</EmptyNote>
      )}
      {sections.map((section) => (
        <InventorySection
          key={section.key}
          inventory={inventory}
          section={section.key}
        >
          {section.failed ? (
            <EmptyNote>{fr.facts.failed}</EmptyNote>
          ) : (
            section.facts.length > 0 && (
              <FactRows>
                {section.facts.map((fact) => (
                  <InventoryRow
                    key={fact.key}
                    label={fact.label}
                    statusLabel={fact.statusLabel}
                    detail={
                      !tagged && fact.detail && titleNames.has(fact.detail)
                        ? null
                        : fact.detail
                    }
                    source={fact.source}
                    status={fact.status}
                    href={fact.href}
                    group={tagged ? fact.group : undefined}
                    edit={isRowEdit(fact.action) ? fact.action : undefined}
                  >
                    {fact.action && !isRowEdit(fact.action) && (
                      <FactAction action={fact.action} />
                    )}
                  </InventoryRow>
                ))}
              </FactRows>
            )
          )}
        </InventorySection>
      ))}
      {/* Not a fact of the dossier: hidden while a state filters. */}
      {!state && (
        <InventorySection inventory={inventory} section="contacts">
          {inventory.projectContacts.length > 0 && (
            <FactRows>
              {inventory.projectContacts.map((contact) => (
                <ProjectContactRow
                  key={contact.id}
                  projectId={inventory.projectId}
                  contact={contact}
                />
              ))}
            </FactRows>
          )}
        </InventorySection>
      )}
      <p className="text-caption text-[color:var(--text-secondary)]">
        {t.note}
      </p>
    </>
  );
}

/** A domain of the dossier: its title, its rows, what may be added. */
function InventorySection({
  inventory,
  section,
  children,
}: {
  inventory: Inventory;
  section: InventorySectionKey;
  children: React.ReactNode;
}) {
  const own = inventory.sections.find((s) => s.key === section);
  // « Déclarer » already on a row of the section: not said twice.
  const onRow = own?.facts.some((fact) => fact.action?.kind === "declare");
  const button =
    own?.failed || onRow ? null : sectionButton(inventory, section);
  return (
    <StepSection
      id={`legal-${section}`}
      title={fr.legal.inventory.sections[section]}
    >
      {children}
      {button && <div className="flex flex-wrap gap-2">{button}</div>}
    </StepSection>
  );
}
