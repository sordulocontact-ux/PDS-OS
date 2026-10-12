import "server-only";

import { cache } from "react";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import {
  artistRelationOf,
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
import { audioStateOf, variantOf } from "@/lib/catalog/title-rules";
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

// The columns of a title every list reads.
export const MASTER_COLUMNS =
  "id, title, variant, variant_label, audio_state, isrc, duration_seconds, final_validated_at, source_master_id";

export type RawMaster = {
  id: string;
  title: string;
  variant: string;
  variant_label: string | null;
  audio_state: string | null;
  isrc: string | null;
  duration_seconds: number | null;
  final_validated_at: string | null;
  source_master_id: string | null;
  credits: RawCredit[];
};

export function toMasterListItem(row: RawMaster): MasterListItem {
  return {
    id: row.id,
    title: row.title,
    variant: variantOf(row.variant),
    variantLabel: row.variant_label,
    audioState: audioStateOf(row.audio_state),
    artists: formatCredits(toCredits(row.credits)),
    isrc: row.isrc,
    durationSeconds: row.duration_seconds,
    finalValidatedAt: row.final_validated_at,
    sourceMasterId: row.source_master_id,
  };
}

/** Live artists by name; `archived` lists the archive instead. */
export async function listArtists(filter?: { archived?: boolean }): Promise<{
  artists: ArtistListItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const query = supabase
    .from("artists")
    .select(
      "id, name, notes, relation, picture_url, picture_path, credits:master_artists!master_artists_artist_same_org(master:masters!master_artists_master_same_org(archived_at))",
    );
  const { data, error } = await (
    filter?.archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null)
  ).order("name");
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
      relation: artistRelationOf(row.relation),
      pictureUrl:
        (row.picture_path && signed.get(row.picture_path)) || row.picture_url,
      masterCount: row.credits.filter((c) => c.master && !c.master.archived_at)
        .length,
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
  "links:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(id, title, created_at, archived_at, releases:releases!releases_project_same_org(title, planned_release_date, online_detected_at)))";

// The latest event of each title's journal (« Dernière modification »).
const LAST_EVENT_SELECT =
  "last:activity_events!activity_events_master_same_org(created_at)";

/**
 * Live masters, newest first; `ids` narrows to those (an artist's),
 * `archived` lists the archive instead.
 */
export async function listMasters(filter?: {
  ids?: string[];
  archived?: boolean;
}): Promise<{
  masters: MasterRow[];
  error: boolean;
}> {
  if (filter?.ids && filter.ids.length === 0)
    return { masters: [], error: false };
  const supabase = await createClient();
  const select = supabase
    .from("masters")
    .select(
      `${MASTER_COLUMNS}, updated_at, ${CREDITS_SELECT}, ${MASTER_RELEASES_SELECT}, ${LAST_EVENT_SELECT}`,
    )
    .order("created_at", { referencedTable: "last", ascending: false })
    .limit(1, { referencedTable: "last" });
  let query = filter?.archived
    ? select.not("archived_at", "is", null)
    : select.is("archived_at", null);
  if (filter?.ids) query = query.in("id", filter.ids);
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) {
    console.error("listMasters:", error.message);
    return { masters: [], error: true };
  }
  return {
    masters: (data ?? []).map((row) => {
      const live = row.links
        .flatMap((l) =>
          l.project && !l.project.archived_at ? [l.project] : [],
        )
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const lastEvent = row.last[0]?.created_at ?? null;
      return {
        ...toMasterListItem(row as RawMaster),
        projectCount: live.length,
        projects: live.map((p) => ({ id: p.id, title: p.title })),
        credited: toCredits(row.credits).map((c) => ({
          id: c.artistId,
          name: c.name,
        })),
        // Compared as instants: the two strings may differ in precision.
        lastChangedAt:
          lastEvent && Date.parse(lastEvent) > Date.parse(row.updated_at)
            ? lastEvent
            : row.updated_at,
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
      };
    }),
    error: false,
  };
}

/** What a picker or a draft needs of a title. */
export function masterOption({
  id,
  title,
  variant,
  variantLabel,
  artists,
}: MasterOption): MasterOption {
  return { id, title, variant, variantLabel, artists };
}

export async function listMasterOptions(): Promise<MasterOption[]> {
  const { masters } = await listMasters();
  return masters.map(masterOption);
}

export const getMaster = cache(
  async (masterId: string): Promise<MasterDetail | null> => {
    if (!catalogIdSchema.safeParse(masterId).success) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("masters")
      .select(
        `${MASTER_COLUMNS}, ${CREDITS_SELECT}, links:project_masters!project_masters_master_same_org(project:projects!project_masters_project_same_org(id, title, type, archived_at, created_at))`,
      )
      .eq("id", masterId)
      .is("archived_at", null)
      .maybeSingle();
    // A failed read is not « not found »: thrown to the error page
    // (app/(app)/app/error.tsx, « Réessayer »), never shown as a 404.
    if (error) throw new Error(`getMaster: ${error.message}`);
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
