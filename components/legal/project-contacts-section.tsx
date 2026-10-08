import {
  AddProjectContactForm,
  RemoveProjectContactButton,
} from "@/components/legal/project-contact-controls";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import type { InventoryRows } from "@/lib/legal/inventory-rows";

/**
 * The people of the legal file without a credit on a title (ticket
 * « Architecture globale », lot 6): a lawyer, a distributor, a
 * photographer… Each one gets a fiche de renseignements and a line in the
 * contract mapping like the credited people. Written by manage_legal.
 */
export function ProjectContactsSection({
  projectId,
  contacts,
}: {
  projectId: string;
  contacts: InventoryRows["projectContacts"];
}) {
  const t = fr.legal.projectContacts;
  return (
    <PageSection
      id="legal-project-contacts"
      title={t.title}
      description={t.description}
      card
    >
      <div className="flex flex-col gap-4">
        {contacts.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-body-md font-semibold break-words">
                    {contact.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {fr.legalForms.roles[contact.role]}
                  </span>
                </span>
                <RemoveProjectContactButton
                  projectId={projectId}
                  rowId={contact.id}
                  name={contact.name}
                />
              </li>
            ))}
          </ul>
        )}
        <AddProjectContactForm projectId={projectId} />
      </div>
    </PageSection>
  );
}
