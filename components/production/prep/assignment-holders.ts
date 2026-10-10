import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { networkRolesOf, rolesText } from "@/lib/network/types";
import { FAMILY_NETWORK_ROLES } from "@/lib/production/roles";
import type { NetworkOption, ProductionNeed } from "@/lib/production/sheet";

export type HolderOption = { value: string; label: string };
export type HolderGroups = {
  known: HolderOption[];
  members: HolderOption[];
  network: HolderOption[];
};

/**
 * Who may hold a position, in the order PO proposes them: the Réseau's
 * contacts whose role fits the family (« profils connus »), PDS's members,
 * then the rest of the Réseau. People already on this position are left
 * out; a person may still hold other positions. Values: "person:<uuid>" or
 * "contact:<uuid>", as the action reads them.
 */
export function holderGroups(
  need: ProductionNeed,
  members: Member[],
  contacts: NetworkOption[],
): HolderGroups {
  const taken = new Set(
    need.assignments.map((a) => `${a.holder.kind}:${a.holder.id}`),
  );
  const fits = new Set(FAMILY_NETWORK_ROLES[need.family]);
  const free = contacts.filter((c) => !taken.has(`contact:${c.id}`));
  const isKnown = (c: NetworkOption) => c.roles.some((r) => fits.has(r));
  const contactOption = (c: NetworkOption): HolderOption => {
    const roles = rolesText(networkRolesOf(c.roles));
    return {
      value: `contact:${c.id}`,
      label: roles
        ? fr.productionNeeds.holders.withRoles(c.name, roles)
        : c.name,
    };
  };
  return {
    known: free.filter(isKnown).map(contactOption),
    members: members
      .filter((m) => !taken.has(`person:${m.personId}`))
      .map((m) => ({ value: `person:${m.personId}`, label: m.name })),
    network: free.filter((c) => !isKnown(c)).map(contactOption),
  };
}
