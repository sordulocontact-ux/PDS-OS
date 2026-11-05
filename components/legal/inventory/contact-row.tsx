"use client";

import { RemoveProjectContactButton } from "@/components/legal/project-contact-controls";
import { FactRow } from "@/components/ui/fact-row";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormRole } from "@/lib/legal/forms/definition";
import { setLegalProjectContactRole } from "@/lib/legal/project-contacts/actions";

const fr = { legal, legalForms };

/**
 * An intervenant non crédité of the État des lieux: the person above, their
 * role as the value, changed in place as the Master changes a fact
 * (« Modifier » → the list, Entrée saves, Échap cancels), and « Retirer ».
 */
export function ProjectContactRow({
  projectId,
  contact,
}: {
  projectId: string;
  contact: { id: string; name: string; role: FormRole };
}) {
  return (
    <FactRow
      label={contact.name}
      value={fr.legalForms.roles[contact.role]}
      source={fr.legal.inventory.contactSource}
      side={
        <RemoveProjectContactButton
          projectId={projectId}
          rowId={contact.id}
          name={contact.name}
        />
      }
      edit={{
        kind: "select",
        value: contact.role,
        options: fr.legalForms.roles,
        done: fr.legal.projectContacts.roleSaved,
        onSave: (role) =>
          setLegalProjectContactRole({ projectId, rowId: contact.id, role }),
      }}
    />
  );
}
