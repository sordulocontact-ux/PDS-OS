import { FactAction } from "@/components/legal/fact-action";
import { InventoryRow } from "@/components/legal/inventory/inventory-row";
import { SectionButtons } from "@/components/legal/inventory/section-buttons";
import { TitleRightsButton } from "@/components/legal/inventory/title-rights-button";
import { RemoveProjectContactButton } from "@/components/legal/project-contact-controls";
import { EmptyNote } from "@/components/shell/empty-state";
import { facts } from "@/lib/i18n/fr/facts";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FactStatus } from "@/lib/facts/types";
import { filterFactSections } from "@/lib/facts/views";
import type { LegalFact, LegalInventory as Inventory } from "@/lib/legal/types";

const fr = { facts, legal, legalForms };

/**
 * Juridique's first step: what the project already knows, as one list of
 * facts (what it is and its state, its source, what to do). Each row leads
 * to the page where the fact is completed; written only through the row's
 * own controls.
 */
export function LegalInventory({
  inventory,
  state,
}: {
  inventory: Inventory;
  // `?state=`: the tile clicked, only its facts shown (lib/facts/views.ts,
  // as on the État du master). The counts stay those of the whole dossier.
  state: FactStatus | null;
}) {
  const t = fr.legal.inventory;
  // « Points signalés au cadrage » are what the Cadrage juridique asks about.
  const sections = filterFactSections(inventory.sections, state).filter(
    (s) => s.key !== "flags",
  );
  const failed = sections.some((s) => s.failed);
  const facts = sections.flatMap((s) => s.facts);
  // Contacts are not a fact of the dossier: hidden while a tile filters.
  const contacts = state ? [] : inventory.projectContacts;
  // « Modifier les droits » sits on a title's first row of the Titres section.
  const firstOfTitle = new Map<string, string>();
  for (const fact of sections.find((s) => s.key === "titles")?.facts ?? [])
    if (fact.group && !firstOfTitle.has(fact.group.key))
      firstOfTitle.set(fact.group.key, fact.key);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5">
      {state && facts.length === 0 && !failed ? (
        <EmptyNote>{t.filterEmpty[state]}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {facts.map((fact) => (
            <InventoryRow
              key={fact.key}
              label={fact.label}
              statusLabel={fact.statusLabel}
              detail={[fact.detail, fact.group?.title]
                .filter(Boolean)
                .join(" · ")}
              source={fact.source}
              status={fact.status}
              href={fact.href}
            >
              {rowAction(fact, inventory, firstOfTitle)}
            </InventoryRow>
          ))}
          {contacts.map((contact) => (
            <InventoryRow
              key={contact.id}
              label={contact.name}
              statusLabel={fr.legalForms.roles[contact.role]}
              detail={null}
              source={t.contactSource}
              status="known"
              href={null}
            >
              <RemoveProjectContactButton
                projectId={inventory.projectId}
                rowId={contact.id}
                name={contact.name}
              />
            </InventoryRow>
          ))}
          {failed && (
            <li>
              <EmptyNote>{fr.facts.failed}</EmptyNote>
            </li>
          )}
          {facts.length === 0 && contacts.length === 0 && !failed && (
            <li>
              <EmptyNote>{fr.facts.noMasters}</EmptyNote>
            </li>
          )}
        </ul>
      )}
      <SectionButtons inventory={inventory} />
    </div>
  );
}

// The row's own controls: its action, plus the rights on a title's first row;
// null falls back to « Compléter » / « Voir ».
function rowAction(
  fact: LegalFact,
  inventory: Inventory,
  firstOfTitle: Map<string, string>,
) {
  const first = fact.group && firstOfTitle.get(fact.group.key) === fact.key;
  const title =
    first && inventory.canEditCatalog
      ? inventory.titles.find((row) => row.masterId === fact.group?.key)
      : undefined;
  if (!fact.action && !title) return null;
  return (
    <>
      {fact.action && <FactAction action={fact.action} />}
      {title && (
        <TitleRightsButton masterId={title.masterId} rights={title.rights} />
      )}
    </>
  );
}
