// Creating a collective project (lot 5 of docs/pds-mic-plan.md): what the
// form proposes and who may convert a selection. Client-safe, pure.

import { can, type Access } from "@/lib/auth/access";
import type { ContentFormatOption } from "@/lib/projects/types";

/** A selection of artists, as the creation form offers it. */
export type SelectionOption = {
  id: string;
  name: string;
  holder: { personId: string; name: string };
  // Its live artists, in their order.
  artists: Array<{ id: string; name: string }>;
};

/**
 * What the form needs for the « Projet collectif » option. `holder`: the
 * viewer converts a selection they hold without creating projects otherwise
 * (a project manager): the project is collective, made from one of their
 * selections, and they run it (launched at once).
 */
export type CollectiveContext = {
  selections: SelectionOption[];
  // Proposed main artist: the house artist (PDS), named like the
  // organization (décision 2).
  houseArtistId: string | null;
  // The format of the PDS Mic model, when it exists.
  modelFormatId: string | null;
  holder: { personId: string; name: string } | null;
};

/**
 * The model a collective starts from (« avec le modèle PDS Mic »): this
 * content format, found by its name among the formats, which stay data.
 * Absent or renamed: nothing is proposed, the format is chosen by hand.
 */
export const COLLECTIVE_MODEL_FORMAT = "PDS Mic";

function key(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The format of the PDS Mic model, or null. */
export function collectiveModelFormatId(
  formats: ContentFormatOption[],
): string | null {
  const wanted = key(COLLECTIVE_MODEL_FORMAT);
  return formats.find((format) => key(format.name) === wanted)?.id ?? null;
}

/** The house artist (PDS): the artist named like the organization, or null. */
export function houseArtistId(
  artists: Array<{ id: string; name: string }>,
  organizationName: string | null,
): string | null {
  if (!organizationName?.trim()) return null;
  const wanted = key(organizationName);
  return artists.find((artist) => key(artist.name) === wanted)?.id ?? null;
}

/** Who turns a selection into a collective project: who creates projects
 * (the direction), or its holder when they manage the Catalogue. Same rule
 * as create_collective_project, which enforces it. */
export function canConvertSelection(
  access: Access,
  holderPersonId: string,
): boolean {
  return (
    can(access, "create_projects") ||
    (access.personId !== null &&
      access.personId === holderPersonId &&
      can(access, "manage_catalog"))
  );
}

/**
 * What a selection brings to the project: its artists but the main one
 * (never a guest of his own project), each with a title of their own.
 */
export function selectionGuests(
  selection: SelectionOption,
  mainArtistId: string | null,
): {
  guests: Array<{ id: string; name: string }>;
  mainArtist: { id: string; name: string } | null;
} {
  return {
    guests: selection.artists.filter((artist) => artist.id !== mainArtistId),
    mainArtist:
      selection.artists.find((artist) => artist.id === mainArtistId) ?? null,
  };
}
