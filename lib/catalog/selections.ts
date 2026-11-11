import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { signArtistPictures } from "@/lib/catalog/pictures";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { artistRelationOf, type ArtistRelation } from "@/lib/catalog/types";
import type { SelectionOption } from "@/lib/projects/collective-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Selections of artists (lot 4 of docs/pds-mic-plan.md), read with the
// viewer's session: every active member reads them (RLS), like the artists.
// An archived artist is kept in the table but neither shown nor counted.

type Person = { personId: string; name: string };

export type SelectionListItem = {
  id: string;
  name: string;
  // Live artists only, in their order.
  artistNames: string[];
  holder: Person;
  updatedAt: string;
};

export type SelectionArtist = {
  id: string;
  name: string;
  pictureUrl: string | null;
  relation: ArtistRelation;
  masterCount: number;
};

export type SelectionDetail = {
  id: string;
  name: string;
  holder: Person;
  createdBy: Person | null;
  createdAt: string;
  // The last hand-over, if any.
  transmittedBy: Person | null;
  transmittedAt: string | null;
  artists: SelectionArtist[];
};

type RawPerson = { first_name: string | null; last_name: string | null } | null;
const nameOf = (person: RawPerson) =>
  person ? personName(person.first_name, person.last_name) : null;

const LIST_SELECT =
  "id, name, updated_at, owner_person_id, owner:people!artist_selections_owner_person_id_fkey(first_name, last_name), items:artist_selection_items!artist_selection_items_selection_same_org(position, artist:artists!artist_selection_items_artist_same_org(name, archived_at))";

/** The live selections, the latest changed first. */
export async function listSelections(): Promise<{
  selections: SelectionListItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_selections")
    .select(LIST_SELECT)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listSelections:", error.message);
    return { selections: [], error: true };
  }
  return {
    selections: data.map((row) => ({
      id: row.id,
      name: row.name,
      artistNames: [...row.items]
        .sort((a, b) => a.position - b.position)
        .flatMap((item) =>
          item.artist && !item.artist.archived_at ? [item.artist.name] : [],
        ),
      holder: {
        personId: row.owner_person_id,
        name: nameOf(row.owner) ?? "",
      },
      updatedAt: row.updated_at,
    })),
    error: false,
  };
}

const OPTION_SELECT =
  "id, name, owner_person_id, owner:people!artist_selections_owner_person_id_fkey(first_name, last_name), items:artist_selection_items!artist_selection_items_selection_same_org(position, artist:artists!artist_selection_items_artist_same_org(id, name, archived_at))";

/** The live selections as the project form offers them (lot 5): their
 * holder and live artists in order, by name. */
export async function listSelectionOptions(): Promise<SelectionOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_selections")
    .select(OPTION_SELECT)
    .is("archived_at", null)
    .order("name");
  if (error) {
    console.error("listSelectionOptions:", error.message);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    holder: { personId: row.owner_person_id, name: nameOf(row.owner) ?? "" },
    artists: [...row.items]
      .sort((a, b) => a.position - b.position)
      .flatMap((item) =>
        item.artist && !item.artist.archived_at
          ? [{ id: item.artist.id, name: item.artist.name }]
          : [],
      ),
  }));
}

const DETAIL_SELECT =
  "id, name, created_at, created_by, transmitted_at, transmitted_by, owner_person_id, owner:people!artist_selections_owner_person_id_fkey(first_name, last_name), creator:people!artist_selections_created_by_fkey(first_name, last_name), transmitter:people!artist_selections_transmitted_by_fkey(first_name, last_name), items:artist_selection_items!artist_selection_items_selection_same_org(position, artist:artists!artist_selection_items_artist_same_org(id, name, relation, picture_url, picture_path, archived_at, credits:master_artists!master_artists_artist_same_org(master:masters!master_artists_master_same_org(archived_at))))";

/** One live selection and its live artists, in their order; null when it
 * does not exist (or is archived). Once per request (the page and its
 * title read it). */
export const getSelection = trackedCache(async function getSelection(
  selectionId: string,
): Promise<SelectionDetail | null> {
  if (!catalogIdSchema.safeParse(selectionId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_selections")
    .select(DETAIL_SELECT)
    .eq("id", selectionId)
    .is("archived_at", null)
    .maybeSingle();
  // A failed read is not « not found »: thrown to the error page.
  if (error) throw new Error(`getSelection: ${error.message}`);
  if (!data) return null;
  const artists = [...data.items]
    .sort((a, b) => a.position - b.position)
    .flatMap((item) =>
      item.artist && !item.artist.archived_at ? [item.artist] : [],
    );
  const signed = await signArtistPictures(
    artists.flatMap((a) => (a.picture_path ? [a.picture_path] : [])),
  );
  return {
    id: data.id,
    name: data.name,
    holder: {
      personId: data.owner_person_id,
      name: nameOf(data.owner) ?? "",
    },
    createdBy: data.created_by
      ? { personId: data.created_by, name: nameOf(data.creator) ?? "" }
      : null,
    createdAt: data.created_at,
    transmittedBy: data.transmitted_by
      ? { personId: data.transmitted_by, name: nameOf(data.transmitter) ?? "" }
      : null,
    transmittedAt: data.transmitted_at,
    artists: artists.map((a) => ({
      id: a.id,
      name: a.name,
      pictureUrl:
        (a.picture_path && signed.get(a.picture_path)) || a.picture_url,
      relation: artistRelationOf(a.relation),
      masterCount: a.credits.filter((c) => c.master && !c.master.archived_at)
        .length,
    })),
  };
});

/** Who a selection can be handed to: the members who manage the Catalogue
 * (empty for a viewer who does not). */
export async function listSelectionRecipients(
  organizationId: string,
): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_selection_recipients", {
    p_organization_id: organizationId,
  });
  if (error) {
    console.error("listSelectionRecipients:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    personId: p.person_id,
    name: personName(p.first_name, p.last_name),
  }));
}
