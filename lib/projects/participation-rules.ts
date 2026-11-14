// The participations of artists in the titles of a collective project
// (docs/pds-mic-plan.md § 3.1, lot 3), as the screens read them. Pure:
// shared by the server and the client.

export const PARTICIPATION_ROLES = ["featuring", "main"] as const;
export type ParticipationRole = (typeof PARTICIPATION_ROLES)[number];

export const PARTICIPATION_STATUSES = [
  "proposed",
  "invited",
  "confirmed",
  "declined",
  "withdrawn",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

/** A guest is featured (décision 10): the default role. */
export function participationRoleOf(value: string): ParticipationRole {
  return value === "main" ? "main" : "featuring";
}

export function participationStatusOf(value: string): ParticipationStatus {
  return (PARTICIPATION_STATUSES as readonly string[]).includes(value)
    ? (value as ParticipationStatus)
    : "proposed";
}

/** Neither declined nor withdrawn: the artist is (still) on the title. A
 * declined or withdrawn participation is kept, with its status. */
export function isActiveParticipation(status: ParticipationStatus): boolean {
  return status !== "declined" && status !== "withdrawn";
}

/** Names as the platforms list them: « A », « A & B », « A, B & C ». */
export function joinArtistNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** A track as the platforms write it: « Marina (feat. Lou Vega & Malo) ».
 * The guests are the title's confirmed featurings. */
export function withFeaturing(
  title: string,
  guests: readonly string[],
): string {
  return guests.length ? `${title} (feat. ${joinArtistNames(guests)})` : title;
}

/** An artist on a title of the collective (title_participations). */
export type TitleParticipation = {
  id: string;
  artist: { id: string; name: string };
  role: ParticipationRole;
  status: ParticipationStatus;
  createdAt: string;
};

/** The active ones first, in the order they were added; the declined and
 * withdrawn after (still listed: nothing is removed). */
export function sortParticipations<T extends TitleParticipation>(
  participations: T[],
): T[] {
  return [...participations].sort(
    (a, b) =>
      Number(!isActiveParticipation(a.status)) -
        Number(!isActiveParticipation(b.status)) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

type ArtistRef = { id: string; name: string };

/**
 * « The artists of the project » (docs/pds-mic-plan.md § 3.1): computed,
 * never stored — the participations neither declined nor withdrawn of the
 * titles not abandoned (they come back with a reactivated title, client
 * 11/11/2026), plus the credits of the active titles. Each artist once, in
 * the order of the titles (a title's credits, then its participations). The
 * main artist is among them as soon as a title has its master, since every
 * title credits him (décision 10); he is never shown in place of the
 * project's artist.
 */
export function projectArtists(
  titles: Array<{
    position: number;
    status: string;
    participations: TitleParticipation[];
    master: { credits: Array<{ artist: ArtistRef }> } | null;
  }>,
): ArtistRef[] {
  const seen = new Map<string, ArtistRef>();
  const add = (artist: ArtistRef) => {
    if (!seen.has(artist.id)) seen.set(artist.id, artist);
  };
  for (const title of [...titles].sort((a, b) => a.position - b.position)) {
    if (title.status === "active")
      for (const credit of title.master?.credits ?? []) add(credit.artist);
    if (title.status === "abandoned") continue;
    for (const participation of title.participations)
      if (isActiveParticipation(participation.status))
        add(participation.artist);
  }
  return [...seen.values()];
}
