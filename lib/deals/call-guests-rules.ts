// Who a deal's call invites by default (Sacha 23/11/2026: « si il n'y a que
// l'artiste dans les contacts ok, mais s'il y a un manager ou un label on ne
// met pas l'artiste »). Client-safe; read by call-guests.ts and the recap.

/** The Réseau contacts checked in « Caler le call »: the deal's people (its
 * contacts, the artist's manager, the participation's contact), else the
 * label or the brand it is negotiated with, else the artist alone. The
 * artist's own contact never sits beside the others. */
export function pickCallGuests(input: {
  people: ReadonlyArray<string | null>;
  counterpartId: string | null;
  artistContactId: string | null;
}): string[] {
  const artist = input.artistContactId;
  const people = [
    ...new Set(
      input.people.filter((id): id is string => !!id && id !== artist),
    ),
  ];
  if (people.length > 0) return people;
  if (input.counterpartId && input.counterpartId !== artist)
    return [input.counterpartId];
  return artist ? [artist] : [];
}
