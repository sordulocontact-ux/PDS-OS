// The contracts a collective's title needs, and the guests whose accord is
// still awaited (retours d'Ibé du 18/11/2026, § 3.4 and 3.5). Pure and
// client-safe, so the rules read and test alone; read by
// lib/legal/title-contracts.ts.
//
// § 3.4: per title, four contracts are proposed, ticked, and the Juridique
// confirms them once (title_contract_needs, confirm_title_contract_needs).
// Drafting stays one contract per person (legal_agreement_needs): this list
// is recorded, nothing is generated from it.
//
// § 3.5: no contract before the accord. The database refuses to draft the
// contract of a guest artist while one of their participations in play has
// no accord validated (generate_legal_contract, « agreement_not_validated »);
// the screens compute the same under RLS (artist_agreement_pending), so they
// say « En attente de l'accord » instead of offering a gesture that would be
// refused.

import { joinArtistNames } from "@/lib/projects/participation-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
  type ProjectTitle,
} from "@/lib/projects/title-rules";

/** The kinds, in the order the screen and the database list them. */
export const TITLE_CONTRACT_KINDS = [
  "production",
  "image_rights",
  "publishing",
  "beatmaker",
] as const;
export type TitleContractKind = (typeof TITLE_CONTRACT_KINDS)[number];

export const isTitleContractKind = (
  value: string,
): value is TitleContractKind =>
  (TITLE_CONTRACT_KINDS as readonly string[]).includes(value);

/** What the Juridique recorded for a title: nothing yet, or the kinds it
 * confirmed as needed (possibly none). */
export type TitleContractNeeds = {
  confirmed: boolean;
  // The kinds confirmed as needed, in order; empty while not confirmed.
  kinds: TitleContractKind[];
};

/** The four lines of a title as the database holds them (the four at once,
 * or none), as its state. */
export function needsOf(
  rows: ReadonlyArray<{ kind: string; needed: boolean }>,
): TitleContractNeeds {
  if (rows.length === 0) return { confirmed: false, kinds: [] };
  return {
    confirmed: true,
    kinds: TITLE_CONTRACT_KINDS.filter((kind) =>
      rows.some((row) => row.kind === kind && row.needed),
    ),
  };
}

/** The boxes ticked when the form opens: all four while nothing is
 * confirmed (the human confirms what is proposed; édition stays unticked
 * at will), then what was confirmed. */
export function tickedKinds(needs: TitleContractNeeds): TitleContractKind[] {
  return needs.confirmed ? needs.kinds : [...TITLE_CONTRACT_KINDS];
}

/** A title as the project names it (« Néons », « Titre de Jay (à nommer) »). */
export const titleLabelOf = (title: ProjectTitle): string =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: masterNameOf(title.master),
    artists: titleGuestNames(title.participations),
  });

/** The name each title's master goes by in the project, by master id: a
 * collective's pages name a title as its project does, not by the
 * provisional name its master was given (« Sans titre · PDS »). */
export function masterLabels(
  titles: readonly ProjectTitle[],
): Map<string, string> {
  return new Map(
    titles.flatMap((title) =>
      title.master ? [[title.master.id, titleLabelOf(title)] as const] : [],
    ),
  );
}

/** A guest artist whose accord is awaited, and the titles concerned. */
export type PendingGuest = {
  artistId: string;
  name: string;
  titles: Array<{ id: string; label: string }>;
};

/**
 * The guests of a collective whose accord is awaited: a participation
 * neither declined nor withdrawn, on a title not abandoned, whose accord is
 * not validated (`validated`, by participation id; none known = not
 * validated, as the database reads it). The main artist is no participation:
 * never awaited. In the titles' order.
 */
export function pendingGuests(
  titles: readonly ProjectTitle[],
  validated: (participationId: string) => boolean,
): PendingGuest[] {
  const byArtist = new Map<string, PendingGuest>();
  for (const title of titles) {
    if (title.status === "abandoned") continue;
    const label = titleLabelOf(title);
    for (const participation of title.participations) {
      if (
        participation.status === "declined" ||
        participation.status === "withdrawn" ||
        validated(participation.id)
      )
        continue;
      const guest = byArtist.get(participation.artist.id) ?? {
        artistId: participation.artist.id,
        name: participation.artist.name,
        titles: [],
      };
      guest.titles.push({ id: title.id, label });
      byArtist.set(participation.artist.id, guest);
    }
  }
  return [...byArtist.values()];
}

/** The names of the guests awaited on this title, as one phrase (« Jay »,
 * « Jay & Iris »); none when no accord is awaited there. */
export function awaitingOnTitle(
  guests: readonly PendingGuest[],
  titleId: string,
): string[] {
  return guests
    .filter((guest) => guest.titles.some((title) => title.id === titleId))
    .map((guest) => guest.name);
}

export const awaitingNames = (names: readonly string[]) =>
  joinArtistNames(names);

/** What `generateReadyAgreements` may draft: ready and not waiting for an
 * accord (the database would refuse the others). */
export function agreementsToGenerate<
  R extends {
    state: string;
    needId: string | null;
    awaitingAgreement?: readonly string[] | null;
  },
>(rows: readonly R[]): R[] {
  return rows.filter(
    (row) =>
      row.state === "ready_to_generate" && row.needId && !row.awaitingAgreement,
  );
}

/** A contract not drafted yet whose person is a guest still waiting for
 * their accord: no gesture of drafting. `awaitingAgreement`: the titles
 * concerned (labels), set when the project is a collective. */
export const isAwaitingAgreement = (row: {
  state: string;
  awaitingAgreement?: readonly string[] | null;
}) => Boolean(row.awaitingAgreement) && row.state === "ready_to_generate";
