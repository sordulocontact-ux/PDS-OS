import "server-only";

import { cache } from "react";

import type { ArtistDetail } from "@/lib/catalog/artist-types";
import {
  isContactRole,
  sortContacts,
  type ArtistContact,
} from "@/lib/catalog/contacts";
import { signArtistPictures } from "@/lib/catalog/pictures";
import {
  CREDITS_SELECT,
  toMasterListItem,
  type RawMaster,
} from "@/lib/catalog/queries";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { createClient } from "@/lib/supabase/server";

// Artist page queries, with the user's session: RLS decides what is visible
// (contacts only with manage_catalog, projects only those the viewer sees).

const ARTIST_SELECT = `id, organization_id, name, legal_name, country_code, bio, notes, picture_url, picture_path, deezer_id, deezer_url, credits:master_artists!master_artists_artist_same_org(master:masters!master_artists_master_same_org(id, title, version, isrc, duration_seconds, archived_at, ${CREDITS_SELECT}, links:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(id, archived_at))))`;

// Cached per request: the layout and the tab pages read the same artist.
export const getArtist = cache(
  async (artistId: string): Promise<ArtistDetail | null> => {
    if (!catalogIdSchema.safeParse(artistId).success) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("artists")
      .select(ARTIST_SELECT)
      .eq("id", artistId)
      .is("archived_at", null)
      .maybeSingle();
    if (error) {
      console.error("getArtist:", error.message);
      return null;
    }
    if (!data) return null;

    const liveMasters = data.credits.flatMap((c) =>
      c.master && !c.master.archived_at ? [c.master] : [],
    );
    const masters = liveMasters
      .map((m) => toMasterListItem(m as RawMaster))
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
    // A project holding two of the artist's masters counts once.
    const projectIds = new Set(
      liveMasters.flatMap((m) =>
        m.links.flatMap((l) =>
          l.project && !l.project.archived_at ? [l.project.id] : [],
        ),
      ),
    );

    const uploaded = data.picture_path
      ? ((await signArtistPictures([data.picture_path])).get(
          data.picture_path,
        ) ?? null)
      : null;
    const pictureUrl = uploaded ?? data.picture_url;

    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      legalName: data.legal_name,
      countryCode: data.country_code,
      bio: data.bio,
      notes: data.notes,
      pictureUrl,
      pictureSource: uploaded ? "upload" : data.picture_url ? "deezer" : null,
      deezerPictureUrl: data.picture_url,
      deezerId: data.deezer_id,
      deezerUrl: data.deezer_url,
      masters,
      projectIds: [...projectIds],
    };
  },
);

/** Contacts of the artist; empty for a viewer without manage_catalog (RLS). */
export async function listArtistContacts(
  artistId: string,
): Promise<ArtistContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_contacts")
    .select("id, role, name, email, phone, is_primary")
    .eq("artist_id", artistId)
    .order("created_at");
  if (error) {
    console.error("listArtistContacts:", error.message);
    return [];
  }
  return sortContacts(
    (data ?? []).map((row) => ({
      id: row.id,
      role: isContactRole(row.role) ? row.role : "other",
      name: row.name,
      email: row.email,
      phone: row.phone,
      isPrimary: row.is_primary,
    })),
  );
}

/** Path of the uploaded picture, to delete it once replaced or removed. */
export async function getArtistPicturePath(
  artistId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("picture_path")
    .eq("id", artistId)
    .maybeSingle();
  return data?.picture_path ?? null;
}
