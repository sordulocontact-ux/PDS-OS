"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { NETWORK_ROLE_OF } from "@/lib/legal/people-facts";
import { listNetworkPeople } from "@/lib/network/people-actions";

/** Who a credit names (Sacha, 05/10/2026): a person of the Réseau (the
 * credit then created linked), added to it, or only a name. */
export function ContributorPersonField({
  defaultName,
  defaultContactId,
  role,
  error,
}: {
  defaultName: string | null;
  defaultContactId: string | null;
  role: ContributorRole;
  error?: string;
}) {
  return (
    <PersonPickerField
      refName="contactId"
      nameName="name"
      legend={fr.masterPage.credits.person}
      required
      load={() => listNetworkPeople()}
      defaultRef={defaultContactId}
      defaultName={defaultName}
      createRoles={[NETWORK_ROLE_OF[role]]}
      refOfContact={(id) => id}
      error={error}
    />
  );
}
