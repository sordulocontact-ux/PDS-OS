// Who a fiche de renseignements goes to: each person credited on the
// project's titles, once (by name, across titles), with the credits to link
// to their contact when it is created for the fiche, a namesake of the
// Réseau when there is one (it is linked first, by a human: « Relier »),
// and the roles their credits already say (to pre-tick,
// « Les rôles préremplis viennent du cadrage et restent corrigeables »).
// Catalog performers are not here: their artist page is their source. The
// people of the Réseau added to the legal file without a credit follow
// (ticket « Architecture globale », lot 6), with the role chosen for them.
// Pure.

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
  // Credits not linked to a contact yet: linked to the contact created for
  // the fiche (never to an existing one: that is « Relier »).
  unlinkedCreditIds: string[];
  // No contact, but the Réseau has someone of that name: no fiche (it would
  // create a duplicate) until the credits are linked.
  namesakeId: string | null;
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
        namesakeId: null,
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
  for (const person of people.values())
    if (!person.contactId)
      person.namesakeId = rows.network.byName.get(person.key)?.id ?? null;
  const credited = new Set(
    [...people.values()].flatMap((p) => (p.contactId ? [p.contactId] : [])),
  );
  const added = rows.projectContacts
    .filter((contact) => !credited.has(contact.contactId))
    .map((contact): FormPerson => ({
      key: `contact:${contact.contactId}`,
      name: contact.name,
      contactId: contact.contactId,
      unlinkedCreditIds: [],
      namesakeId: null,
      creditRoles: [],
      formRoles: [contact.role],
      networkRoles: [],
    }));
  return [...people.values(), ...added];
}
