// Ingénieurs du Réseau of the État du master: the contacts with the engineer
// role, and what PDS already did with each (the titles where a mix or
// mastering credit is linked to them). Pure, from rows already read.

import { routes } from "@/lib/auth/redirects";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import type {
  EngineerRole,
  NetworkEngineer,
} from "@/lib/master-workflow/types";
import type { NetworkRole } from "@/lib/network/types";

const fr = { masterWorkflow };

export type FlowContact = {
  id: string;
  name: string;
  roles: NetworkRole[];
  email: string | null;
  phone: string | null;
  city: string | null;
  parentId: string | null;
};

/** A mix or mastering credit linked to a contact, on any title. */
export type FlowLinkedCredit = {
  contactId: string;
  masterId: string;
  role: EngineerRole;
};

/**
 * Every engineer of the Réseau, those PDS worked with most first, then by
 * name. A credit counts once per title and role.
 */
export function networkEngineers(
  contacts: FlowContact[],
  credits: FlowLinkedCredit[],
): NetworkEngineer[] {
  const t = fr.masterWorkflow.inventory.network;
  const names = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const titles = new Map<string, Record<EngineerRole, Set<string>>>();
  for (const credit of credits) {
    const of = titles.get(credit.contactId) ?? {
      mix_engineer: new Set<string>(),
      mastering_engineer: new Set<string>(),
    };
    of[credit.role].add(credit.masterId);
    titles.set(credit.contactId, of);
  }

  return contacts
    .filter((contact) => contact.roles.includes("engineer"))
    .map((contact) => {
      const of = titles.get(contact.id);
      const mix = of?.mix_engineer.size ?? 0;
      const mastering = of?.mastering_engineer.size ?? 0;
      const history = [
        mix > 0 ? t.mixHistory(mix) : null,
        mastering > 0 ? t.masteringHistory(mastering) : null,
      ].filter(Boolean);
      return {
        engineer: {
          id: contact.id,
          name: contact.name,
          href: routes.networkContact(contact.id),
          structure: contact.parentId
            ? (names.get(contact.parentId) ?? null)
            : null,
          city: contact.city,
          email: contact.email,
          phone: contact.phone,
          history: history.length > 0 ? history.join(" · ") : null,
        },
        weight: mix + mastering,
      };
    })
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        a.engineer.name.localeCompare(b.engineer.name, "fr"),
    )
    .map(({ engineer }) => engineer);
}
