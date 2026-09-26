import "server-only";

import { cache } from "react";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import {
  formatCredits,
  isCreditRole,
  type ArtistListItem,
  type ArtistOption,
  type Credit,
  type MasterDetail,
  type MasterListItem,
  type MasterOption,
  type MasterRow,
} from "@/lib/catalog/types";
import { pickMasterRelease } from "@/lib/catalog/master-release";
import { signArtistPictures } from "@/lib/catalog/pictures";
import { createClient } from "@/lib/supabase/server";

// Every query runs with the user's session: RLS decides what is visible.

export const CREDITS_SELECT =
  "credits:master_artists!master_artists_master_same_org(position, role, artist:artists!master_artists_artist_same_org(id, name))";

export type RawCredit = {
  position: number;
  role: string;
  artist: { id: string; name: string } | null;
};

export function toCredits(raw: RawCredit[]): Credit[] {
  return [...raw]
    .sort((a, b) => a.position - b.position)
    .flatMap((c) =>
      c.artist
        ? [
            {
              artistId: c.artist.id,
              name: c.artist.name,
              role: isCreditRole(c.role) ? c.role : "main",
            },
          ]
        : [],
    );
}

export type RawMaster = {
  id: string;
  title: string;
  version: string | null;
  isrc: string | null;
  duration_seconds: number | null;
  credits: RawCredit[];
};

export function toMasterListItem(row: RawMaster): MasterListItem {
  return {
    id: row.id,
    title: row.title,
    version: row.version,
    artists: formatCredits(toCredits(row.credits)),
    isrc: row.isrc,
    durationSeconds: row.duration_seconds,
  };
}

export async function listArtists(): Promise<{
  artists: ArtistListItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select(
      "id, name, notes, picture_url, picture_path, credits:master_artists!master_artists_artist_same_org(count)",
    )
    .is("archived_at", null)
    .order("name");
  if (error) {
    console.error("listArtists:", error.message);
    return { artists: [], error: true };
  }
  const rows = data ?? [];
  const signed = await signArtistPictures(
    rows.flatMap((row) => (row.picture_path ? [row.picture_path] : [])),
  );
  return {
    artists: rows.map((row) => ({
      id: row.id,
      name: row.name,
      notes: row.notes,
      pictureUrl:
        (row.picture_path && signed.get(row.picture_path)) || row.picture_url,
      masterCount: row.credits[0]?.count ?? 0,
    })),
    error: false,
  };
}

export async function listArtistOptions(): Promise<ArtistOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) {
    console.error("listArtistOptions:", error.message);
    return [];
  }
  return data ?? [];
}

// The active artist holding this name, compared like the unique index does
// (case and surrounding spaces ignored).
export async function findArtistByName(
  name: string,
): Promise<ArtistOption | null> {
  const key = name.trim().toLowerCase();
  const artists = await listArtistOptions();
  return artists.find((a) => a.name.trim().toLowerCase() === key) ?? null;
}

// Active artists already imported from these Deezer profiles, by Deezer id.
export async function findArtistsByDeezerIds(
  deezerIds: number[],
): Promise<Map<number, ArtistOption>> {
  const found = new Map<number, ArtistOption>();
  if (deezerIds.length === 0) return found;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, deezer_id")
    .in("deezer_id", deezerIds)
    .is("archived_at", null);
  if (error) {
    console.error("findArtistsByDeezerIds:", error.message);
    return found;
  }
  for (const row of data ?? []) {
    if (row.deezer_id !== null)
      found.set(row.deezer_id, { id: row.id, name: row.name });
  }
  return found;
}

// Releases of the master's live projects, for the release column of the list.
const MASTER_RELEASES_SELECT =
  "links:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(archived_at, releases:releases!releases_project_same_org(title, planned_release_date, online_detected_at)))";

export async function listMasters(): Promise<{
  masters: MasterRow[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("masters")
    .select(
      `id, title, version, isrc, duration_seconds, ${CREDITS_SELECT}, ${MASTER_RELEASES_SELECT}`,
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listMasters:", error.message);
    return { masters: [], error: true };
  }
  return {
    masters: (data ?? []).map((row) => ({
      ...toMasterListItem(row as RawMaster),
      release: pickMasterRelease(
        row.links.flatMap((l) =>
          l.project && !l.project.archived_at
            ? l.project.releases.map((r) => ({
                title: r.title,
                plannedReleaseDate: r.planned_release_date,
                onlineDetectedAt: r.online_detected_at,
              }))
            : [],
        ),
      ),
    })),
    error: false,
  };
}

export async function listMasterOptions(): Promise<MasterOption[]> {
  const { masters } = await listMasters();
  return masters.map(({ id, title, version, artists }) => ({
    id,
    title,
    version,
    artists,
  }));
}

export const getMaster = cache(
  async (masterId: string): Promise<MasterDetail | null> => {
    if (!catalogIdSchema.safeParse(masterId).success) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("masters")
      .select(
        `id, title, version, isrc, duration_seconds, ${CREDITS_SELECT}, links:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(id, title, type, archived_at, created_at))`,
      )
      .eq("id", masterId)
      .maybeSingle();
    if (error) {
      console.error("getMaster:", error.message);
      return null;
    }
    if (!data) return null;
    const projects = data.links
      .flatMap((l) => (l.project && !l.project.archived_at ? [l.project] : []))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ id, title, type }) => ({ id, title, type }));
    return {
      ...toMasterListItem(data as RawMaster),
      credits: toCredits(data.credits as RawCredit[]),
      projects,
    };
  },
);
