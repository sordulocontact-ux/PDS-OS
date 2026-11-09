// What PDS OS already knows for each field of the bulletin, with where it
// comes from (ticket Juridique 06, « PO préremplit les champs sourcés et
// liste les valeurs manquantes »). Never an ISWC that is not on the title,
// never a draft's duration. The first exploitation is proposed from the
// planned release (recette Juridique V1, JUR-02), « Proposé » until a person
// confirms it. The participants are the
// title's main artists (never made authors: their role is confirmed by a
// person, retour d'Ibé du 02/11/2026) and its credited creators, one per
// person with all their roles. Their shares within each category start from
// the title's confirmed split (UX test of 09/10/2026, decided with Sacha on
// 10/10), matched by contact, never by name, and shown « à vérifier ». A signed
// publishing contract of the project ticks « copie jointe » (also done in
// SQL when the contract is signed later: contracts_tick_formalities). Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import {
  QUALITY_OF_ROLE,
  creatorIdentity,
  type Creator,
  type Publisher,
  type Quality,
} from "@/lib/legal/formalities/definition";
import {
  CATEGORIES,
  membersOf,
  withSoleShares,
} from "@/lib/legal/formalities/participants";
import { allocate } from "@/lib/legal/formalities/sharing-rule";
import { FULL, shareOf, unitsOf } from "@/lib/legal/splits/shares";

export type Prefill = Record<
  string,
  { value: unknown; source: string } | undefined
>;

// A line of the title's confirmed split: exact share, « 33.3334 ».
export type SplitShare = {
  contactId: string | null;
  role: string;
  share: string;
  // PDS Éditions' line (JUR-01): the team, no contact.
  house?: boolean;
};

export type PrefillContext = {
  title: string;
  durationSeconds: number | null;
  audioState: string | null;
  iswc: string | null;
  performers: string[];
  // The title's main artists, with their Réseau contact when they have one.
  mainArtists: Array<{
    name: string;
    contactId: string | null;
    details: Record<string, string>;
  }>;
  credits: Array<{
    name: string;
    role: ContributorRole;
    contactId: string | null;
    details: Record<string, string>;
  }>;
  // The publishers of the title's publishing split (their name, never their
  // share), with their contact and fiche when linked.
  publishers: Array<{
    name: string;
    contactId: string | null;
    details: Record<string, string>;
  }>;
  // The project's signed publishing contract, by its title, if there is one.
  signedPublishingContract: string | null;
  // The title's confirmed split, if there is one.
  splitShares: SplitShare[] | null;
  // The project's planned release day, « 2026-12-05 ».
  releaseDate: string | null;
};

// The share of a person in the confirmed split: the line of their contact
// with this role, else their only line. Never by name.
export function splitShareOf(
  shares: SplitShare[] | null,
  contactId: string | null,
  role: string,
): string {
  if (!shares || !contactId) return "";
  const own = shares.filter((s) => s.contactId === contactId);
  return (
    (own.find((s) => s.role === role) ?? (own.length === 1 ? own[0] : null))
      ?.share ?? ""
  );
}

const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Each category shared as the confirmed split weighs its members, when it
// knows them all; otherwise left to type.
function sharesFromSplit(
  creators: Creator[],
  publishers: Publisher[],
  weightOf: (member: {
    creator?: number;
    role?: Quality;
    publisher?: number;
  }) => number,
): boolean {
  const members = membersOf(creators, publishers);
  let any = false;
  for (const category of CATEGORIES) {
    const list = members[category];
    const weights = list.map(weightOf);
    if (list.length === 0 || weights.some((w) => w <= 0)) continue;
    allocate(FULL, weights).forEach((u, k) => {
      const share = shareOf(u).replace(/\.?0+$/, "");
      const m = list[k];
      if (m.publisher !== undefined) publishers[m.publisher].share = share;
      else creators[m.creator!].shares[m.role!] = share;
    });
    any = true;
  }
  return any;
}

export function prefillSacem725(ctx: PrefillContext): Prefill {
  const byKey = new Map<string, Creator>();
  for (const a of ctx.mainArtists) {
    const key = a.contactId ?? a.name;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      ...creatorIdentity(a.name, a.details),
      roles: [],
      shares: {},
      signs: true,
      main_artist: true,
      ...(a.contactId ? { contact_id: a.contactId } : {}),
    });
  }
  for (const c of ctx.credits) {
    const quality = QUALITY_OF_ROLE[c.role];
    if (!quality) continue;
    const key = c.contactId ?? c.name;
    const known = byKey.get(key);
    if (known) {
      if (!known.roles.includes(quality)) known.roles.push(quality);
      continue;
    }
    byKey.set(key, {
      ...creatorIdentity(c.name, c.details),
      roles: [quality],
      shares: {},
      signs: true,
      ...(c.contactId ? { contact_id: c.contactId } : {}),
    });
  }
  const participants = [...byKey.values()];
  const named = new Set<string>();
  // PDS Éditions: the publisher without a Réseau contact when the confirmed
  // split has the house's line — signed by the direction in PDS OS (JUR-03).
  const houseLine = ctx.splitShares?.find((s) => s.house) ?? null;
  let houseNamed = false;
  const publishers: Publisher[] = ctx.publishers.flatMap((p) => {
    const key = p.contactId ?? p.name;
    if (named.has(key)) return [];
    named.add(key);
    const house = !p.contactId && houseLine !== null && !houseNamed;
    houseNamed ||= house;
    return [
      {
        name: p.name,
        ipi: p.details.ipi_coad || "",
        share: "",
        ...(p.contactId ? { contact_id: p.contactId } : {}),
        ...(house ? { house: true } : {}),
      },
    ];
  });
  const listed = publishers.slice(0, 3);
  const fromSplit = sharesFromSplit(participants, listed, (m) =>
    m.publisher !== undefined
      ? (unitsOf(
          listed[m.publisher].house
            ? (houseLine?.share ?? "")
            : splitShareOf(
                ctx.splitShares,
                listed[m.publisher].contact_id ?? null,
                "publisher",
              ),
        ) ?? 0)
      : (unitsOf(
          splitShareOf(
            ctx.splitShares,
            participants[m.creator!].contact_id ?? null,
            m.role!,
          ),
        ) ?? 0),
  );
  const people = withSoleShares(participants, listed);
  return {
    title: { value: ctx.title, source: "Titre" },
    duration:
      ctx.durationSeconds && ctx.audioState === "final_master"
        ? { value: minutes(ctx.durationSeconds), source: "Master final" }
        : undefined,
    iswc: ctx.iswc ? { value: ctx.iswc, source: "Titre" } : undefined,
    first_exploitation: ctx.releaseDate
      ? { value: ctx.releaseDate, source: "Date de sortie prévue" }
      : undefined,
    performers:
      ctx.performers.length > 0
        ? { value: ctx.performers.join(", "), source: "Artistes du titre" }
        : undefined,
    creators:
      people.creators.length > 0
        ? {
            value: people.creators,
            source: "Artistes, crédits et fiches de renseignements",
          }
        : undefined,
    // Not a field of the bulletin: says the shares came from the split.
    phono_from_split:
      ctx.splitShares && fromSplit
        ? { value: true, source: "Répartition confirmée" }
        : undefined,
    publishers:
      people.publishers.length > 0
        ? { value: people.publishers, source: "Répartition de l'édition" }
        : undefined,
    publishing_contract: ctx.signedPublishingContract
      ? {
          value: { provided: true, rubric_g: "" },
          // Same words as the SQL trigger.
          source: `Contrat signé : ${ctx.signedPublishingContract}`.slice(
            0,
            200,
          ),
        }
      : undefined,
  };
}
