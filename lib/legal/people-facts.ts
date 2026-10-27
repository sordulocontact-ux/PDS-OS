// Personnes of the État des lieux: a title's performing artists, then its
// other credits, and whether each person is in the Réseau. Pure, built by
// code from rows already read.

import { routes } from "@/lib/auth/redirects";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import {
  creditContactState,
  type CreditLink,
  type CreditRights,
  type NetworkIndex,
} from "@/lib/facts/credit-contact";
import { groupOf } from "@/lib/facts/types";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { InventoryMaster } from "@/lib/legal/title-facts";
import type { LegalFact } from "@/lib/legal/types";
import type { NetworkRole } from "@/lib/network/types";

const fr = { legal, masterPage };

export type InventoryContributor = {
  id: string;
  name: string;
  role: ContributorRole;
  detail: string | null;
  // Its contact in the Réseau, once linked (master_contributors.contact_id).
  contactId: string | null;
};

/** A catalog artist credited on the title (master_artists). */
export type InventoryPerformer = {
  artistId: string;
  name: string;
  featuring: boolean;
};

const t = fr.legal.inventory;

// The network role a credit suggests when its person is added to Réseau
// (only a proposal: the form lets the user change it).
export const NETWORK_ROLE_OF: Record<ContributorRole, NetworkRole> = {
  composer: "songwriter",
  lyricist: "songwriter",
  arranger: "musician",
  producer: "producer",
  co_producer: "producer",
  recording_engineer: "engineer",
  mix_engineer: "engineer",
  mastering_engineer: "engineer",
  musician: "musician",
  other: "other",
};

export type PeopleRights = CreditRights;

/**
 * A performer is a catalog artist: its artist page is the source (Juridique
 * 01: the intake reads « Artiste » as it reads the Réseau; never ask again
 * what is reliable). The SACEM 725 bulletin only names performers; nothing
 * more is required of them here.
 */
function performerFact(
  master: InventoryMaster,
  performer: InventoryPerformer,
): LegalFact {
  return {
    key: `performer-${master.id}-${performer.artistId}`,
    label: performer.name,
    detail: performer.featuring ? t.facts.featuring : t.facts.performer,
    group: groupOf(master),
    source: t.sources.artist,
    status: "known",
    statusLabel: t.states.catalogArtist,
    href: routes.artist(performer.artistId),
  };
}

function contributorFact(
  master: InventoryMaster,
  contributor: InventoryContributor,
  network: NetworkIndex,
  rights: PeopleRights,
  sameName: Map<string, CreditLink[]>,
): LegalFact {
  return {
    key: `person-${contributor.id}`,
    label: contributor.name,
    detail: [fr.masterPage.credits.roles[contributor.role], contributor.detail]
      .filter(Boolean)
      .join(" · "),
    group: groupOf(master),
    source: t.sources.credits,
    ...creditContactState(
      { ...contributor, masterId: master.id },
      network,
      rights,
      NETWORK_ROLE_OF[contributor.role],
      sameName,
    ),
  };
}

/**
 * Who worked on a title: its performers first (as on the title's Crédits),
 * then its other credits; one "no credit" fact when there is none.
 */
export function peopleFacts(
  master: InventoryMaster,
  performers: InventoryPerformer[],
  contributors: InventoryContributor[],
  network: NetworkIndex,
  rights: PeopleRights,
  // The project's unlinked credits by name: adding or linking a person links
  // every credit of that name, on every title (unlinkedCreditsByName).
  sameName: Map<string, CreditLink[]>,
): LegalFact[] {
  if (performers.length === 0 && contributors.length === 0)
    return [
      {
        key: `credits-${master.id}`,
        label: t.facts.credits,
        detail: null,
        group: groupOf(master),
        source: t.sources.credits,
        status: "missing",
        statusLabel: t.states.noContributor,
        href: routes.masterCredits(master.id),
      },
    ];
  return [
    ...performers.map((p) => performerFact(master, p)),
    ...contributors.map((c) =>
      contributorFact(master, c, network, rights, sameName),
    ),
  ];
}
