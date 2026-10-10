import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { Holder, NetworkOption } from "@/lib/production/sheet";

const t = fr.productionPreprod.plan;

/** The choices of a « who » select: nobody, PDS's members, then the Réseau.
 * Values "none", "person:<uuid>", "contact:<uuid>", as the actions read them. */
export function holderItems(
  members: Member[],
  contacts: NetworkOption[],
): Record<string, string> {
  return {
    none: t.noHolder,
    ...Object.fromEntries(members.map((m) => [`person:${m.personId}`, m.name])),
    ...Object.fromEntries(
      contacts.map((c) => [`contact:${c.id}`, t.fromNetwork(c.name)]),
    ),
  };
}

export const holderValue = (holder: Holder | null) =>
  holder ? `${holder.kind}:${holder.id}` : "none";
