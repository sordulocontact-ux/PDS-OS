// Who a fiche de renseignements goes to: each person credited on the
// project's titles, once (by name, across titles), with the credits to link
// to their contact and the roles their credits already say (to pre-tick,
// « Les rôles préremplis viennent du cadrage et restent corrigeables »).
// Catalog performers are not here: their artist page is their source. Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import type { FormRole } from "@/lib/legal/forms/definition";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import { NETWORK_ROLE_OF } from "@/lib/legal/people-facts";
import type { NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

const FORM_ROLE_OF: Record<ContributorRole, FormRole> = {
  composer: "composer",
  lyricist: "author",
  arranger: "arranger",
  producer: "producer",
  co_producer: "producer",
  recording_engineer: "provider",
  mix_engineer: "provider",
  mastering_engineer: "provider",
  musician: "musician",
  other: "other",
};

export type FormPerson = {
  key: string;
  name: string;
  contactId: string | null;
  // Credits not linked to a contact yet: linked when the fiche is prepared.
  unlinkedCreditIds: string[];
  creditRoles: ContributorRole[];
  formRoles: FormRole[];
  networkRoles: NetworkRole[];
};

function addOnce<T>(list: T[], value: T) {
  if (!list.includes(value)) list.push(value);
}

export function formPeople(rows: InventoryRows): FormPerson[] {
  const people = new Map<string, FormPerson>();
  for (const master of rows.titles)
    for (const credit of rows.creditsOf.get(master.id) ?? []) {
      const key = normalizeSearch(credit.name);
      const person = people.get(key) ?? {
        key,
        name: credit.name,
        contactId: null,
        unlinkedCreditIds: [],
        creditRoles: [],
        formRoles: [],
        networkRoles: [],
      };
      person.contactId ??= credit.contactId;
      if (!credit.contactId) person.unlinkedCreditIds.push(credit.id);
      addOnce(person.creditRoles, credit.role);
      addOnce(person.formRoles, FORM_ROLE_OF[credit.role]);
      addOnce(person.networkRoles, NETWORK_ROLE_OF[credit.role]);
      people.set(key, person);
    }
  return [...people.values()];
}
