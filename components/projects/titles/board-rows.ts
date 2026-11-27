import { waiverTexts } from "@/components/legal/waiver-lines";
import { routes } from "@/lib/auth/redirects";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  isActiveParticipation,
  type ParticipationRole,
} from "@/lib/projects/participation-rules";
import type {
  ContactState,
  RecapParticipation,
  RecapTitle,
  TitleRecap,
} from "@/lib/projects/recap-rules";
import type { SharedNegotiationCall } from "@/lib/deals/negotiation-call-rules";
import { contractGap } from "@/lib/projects/title-board-rules";
import { creditModeOf, masterNameOf } from "@/lib/projects/title-rules";
import type { Tone } from "@/lib/ui/state-tones";

// The rows of « Titres » par artiste (TitlesBoard), what its table, its
// phone cards, its side sheet (TitleArtistSheet) and the overview's compact
// recap read: one row per artist on a title, a title without an artist on
// its own row. No hook: read on the server too.

const fr = { projectTitles };

/** Where a title leads: the project's Master (a title with a master), its
 * release's deposit in the Distribution (lot 15, by title: its own release,
 * else the compilation's). Null when the project has no such workflow. */
export type TitleDepositLink = { href: string; label: string; tone: Tone };
export type BoardLinks = {
  master: string | null;
  distribution: Record<string, TitleDepositLink> | null;
  // A launched collective: a title's name opens its page (« Titres »,
  // Maël 25/11/2026); else its Master.
  tracks?: boolean;
};

/** A row: an artist on a title, or a title without any artist yet. Its id
 * is the participation's (`?ouvrir=` of the side sheet), else the title's. */
export type BoardRow = {
  id: string;
  title: RecapTitle;
  participation: RecapParticipation | null;
};

/** What a row's cells, « ⋯ » and side sheet need of the board. */
export type BoardContext = {
  projectId: string;
  links: BoardLinks;
  // Writes the titles and their artists (its owner).
  canManage: boolean;
  canReadLegal: boolean;
  canEditNetwork: boolean;
  // « Caler le call »'s shared data; null: nobody plans a call here.
  call: SharedNegotiationCall | null;
  // The artists' notes, read and written; none on an overview.
  notes: boolean;
  // Paris's day, read by the server (a waiver's due date, lot 12).
  today: string;
};

/** The rows, the abandoned titles last: `live`, then `abandoned` (under
 * « Abandonnés »). The status filter keeps the artists in the states
 * chosen; a title stays while one of its artists does (an abandoned title
 * is out of the counts, so of the filter too). None chosen: everything. */
export function boardRowsOf(
  recap: TitleRecap,
  filter: ContactState[],
): { live: BoardRow[]; abandoned: BoardRow[] } {
  const filtering = filter.length > 0;
  const live: BoardRow[] = [];
  const abandoned: BoardRow[] = [];
  for (const title of recap.titles) {
    const out = title.status === "abandoned";
    if (filtering && out) continue;
    const shown = filtering
      ? title.participations.filter(
          (p) =>
            p.recap.contactState !== null &&
            filter.includes(p.recap.contactState),
        )
      : title.participations;
    if (filtering && shown.length === 0) continue;
    const rows: BoardRow[] =
      shown.length === 0
        ? [{ id: title.id, title, participation: null }]
        : shown.map((p) => ({ id: p.id, title, participation: p }));
    (out ? abandoned : live).push(...rows);
  }
  return { live, abandoned };
}

/** The roles said on the board: none when every artist has the same (one
 * column « Rôle » would repeat « Featuring » on each row, Sacha
 * 27/11/2026). */
export function variedRoles(recap: TitleRecap): boolean {
  const roles = new Set<ParticipationRole>();
  for (const title of recap.titles)
    for (const p of title.participations) roles.add(p.role);
  return roles.size > 1;
}

/** A title without a name of its own (its label says its guests). */
export const isUnnamed = (title: RecapTitle) =>
  !title.workingTitle && !masterNameOf(title.master);

/** The title's Master, open on this title (lot 8), once it has a master; an
 * abandoned title is out of it (lot 9). */
export const masterHrefOf = (title: RecapTitle, links: BoardLinks) =>
  title.master && links.master && title.status !== "abandoned"
    ? `${links.master}?titre=${title.master.id}`
    : null;

/** Where the title's name leads: its page in a launched collective, else
 * its Master. */
export const titleHrefOf = (
  projectId: string,
  title: RecapTitle,
  links: BoardLinks,
) =>
  links.tracks
    ? routes.projectTrack(projectId, title.id)
    : masterHrefOf(title, links);

/** How a confirmation credits the title (creditModeOf), and the warning of
 * a title a simple project shares (« Crédits à vérifier au Catalogue : ce
 * titre est aussi dans le projet … », décision 10). */
export type Credit = { mode: "now" | "later" | "manual"; shared: string };

export function creditOf(title: RecapTitle): Credit {
  return {
    mode: creditModeOf(title),
    shared: title.sharedWith
      ? fr.projectTitles.participations.shared(
          title.sharedWith.names,
          title.sharedWith.hidden,
        )
      : "",
  };
}

/** The row's artist is in play: neither declined nor withdrawn, on a title
 * not abandoned. */
export const isActiveRow = (row: BoardRow) =>
  row.participation !== null &&
  isActiveParticipation(row.participation.status) &&
  row.title.status !== "abandoned";

/**
 * An artist's alerts, in words: credits to check (confirmed on a title a
 * simple project shares, décision 10), contract not signed for whoever does
 * not read the Juridique (lot 12: its Contrat column says it to the
 * others), waivers still open. `strong`: one waits for the contract.
 */
export function rowAlerts(
  row: BoardRow,
  input: { canReadLegal: boolean; today: string },
): { alerts: string[]; strong: boolean } {
  const p = row.participation;
  if (!p || row.title.status === "abandoned")
    return { alerts: [], strong: false };
  const t = fr.projectTitles;
  const toCheck =
    creditModeOf(row.title) === "manual" && p.status === "confirmed";
  const missing =
    !input.canReadLegal && contractGap(row.title, p, input.today) !== null;
  return {
    alerts: [
      ...(toCheck ? [t.participations.sharedShort] : []),
      ...(missing ? [t.recap.contractMissing] : []),
      ...waiverTexts(p.waivers, input.today),
    ],
    strong: missing,
  };
}

/** Décision 4.1: where each artist is already invited (a participation in
 * play, on a title not abandoned), by title, for « Ajouter un artiste »:
 * the other titles' labels. */
export function invitedOnOf(
  recap: TitleRecap,
): (titleId: string) => Record<string, string[]> {
  const invited = new Map<string, Array<{ titleId: string; label: string }>>();
  for (const title of recap.titles) {
    if (title.status === "abandoned") continue;
    for (const p of title.participations)
      if (isActiveParticipation(p.status))
        invited.set(p.artist.id, [
          ...(invited.get(p.artist.id) ?? []),
          { titleId: title.id, label: title.recap.label },
        ]);
  }
  return (titleId) =>
    Object.fromEntries(
      [...invited]
        .map(
          ([artistId, list]) =>
            [
              artistId,
              list.filter((i) => i.titleId !== titleId).map((i) => i.label),
            ] as const,
        )
        .filter(([, labels]) => labels.length > 0),
    );
}
