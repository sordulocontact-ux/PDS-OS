// What a contact's roles in the Réseau say of their role in a legal file
// (the role of a fiche de renseignements, lib/legal/forms/definition.ts):
// pre-filled when the person is picked, always correctable. Pure.

import type { FormRole } from "@/lib/legal/forms/definition";
import type { NetworkRole } from "@/lib/network/types";

const FORM_ROLE_OF: Record<NetworkRole, FormRole> = {
  artist: "performer",
  beatmaker: "producer",
  musician: "musician",
  songwriter: "composer",
  engineer: "provider",
  producer: "producer",
  art_director: "provider",
  videographer: "provider",
  photographer: "provider",
  designer: "provider",
  provider: "provider",
  studio: "studio",
  lawyer: "lawyer",
  partner: "other",
  label: "label",
  publisher: "publisher",
  distributor: "other",
  media: "other",
  journalist: "other",
  influencer: "provider",
  manager: "other",
  other: "other",
};

/** The first role of the Réseau that says something, else « Autre ». */
export function suggestedFormRole(roles: readonly NetworkRole[]): FormRole {
  for (const role of roles) {
    const formRole = FORM_ROLE_OF[role];
    if (formRole && formRole !== "other") return formRole;
  }
  return "other";
}
