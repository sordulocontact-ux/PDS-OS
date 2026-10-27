// « Qui fait quoi » of the Master (C7, proto rolesModal): who coordinates,
// who mixes and masters through a private link, who validates the versions,
// and the engineers' links. Built by code from the journey's facts. Pure.

import type { PrivateLinkRow } from "@/components/shell/module/private-links";
import type { RoleRow } from "@/components/shell/module/roles-panel";
import { masterJourney } from "@/lib/i18n/fr/master-journey";

import type { MasterJourneyFacts } from "./journey-facts";

const fr = { masterJourney };

const t = fr.masterJourney.roles;

export function masterRoles(
  facts: MasterJourneyFacts,
  owner: string | null,
): { roles: RoleRow[]; links: PrivateLinkRow[] } {
  const b = facts.brief;
  const mix = b?.mixContact ?? null;
  const mastering = b?.masteringSame ? mix : (b?.masteringContact ?? null);
  const validator = b?.validatorName ?? owner;
  const roles: RoleRow[] = [
    {
      key: "owner",
      label: t.owner,
      kind: "coord",
      holder: owner ? { name: owner } : null,
      what: t.ownerWhat,
    },
    {
      key: "mix",
      label: t.mix,
      kind: "exec",
      holder: mix ? { name: mix.name, viaLink: true } : null,
      what: t.mixWhat,
    },
    {
      key: "mastering",
      label: t.mastering,
      kind: "exec",
      holder: mastering ? { name: mastering.name, viaLink: true } : null,
      what: t.masteringWhat,
    },
    {
      key: "validator",
      label: t.validator,
      kind: "valid",
      holder: validator ? { name: validator } : null,
      what: t.validatorWhat,
    },
  ];
  const seen = new Set<string>();
  const links: PrivateLinkRow[] = facts.transmissions.flatMap((x) => {
    if (seen.has(x.contactId)) return [];
    seen.add(x.contactId);
    const all = facts.transmissions.filter((y) => y.contactId === x.contactId);
    return [
      {
        key: x.id,
        name: x.contactName,
        role: x.role === "mix" ? t.mix : t.mastering,
        link: {
          number: all.length,
          createdAt: x.createdAt,
          createdBy: x.sentBy,
          sentAt: x.linkSentAt,
          openedAt: x.openedAt,
          expiresAt: x.expiresAt,
          revokedAt: x.revokeReason ? x.revokedAt : null,
        },
      },
    ];
  });
  return { roles, links };
}
