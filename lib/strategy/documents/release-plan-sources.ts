import "server-only";

import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { signArtistPictures } from "@/lib/catalog/pictures";
import { approvedOf, sentOf, versionsOf } from "@/lib/strategy/documents/model";
import type { StrategyDocuments } from "@/lib/strategy/documents/queries";
import {
  releasePlanConfigOf,
  visualKey,
  type ReleasePlanConfig,
  type Visual,
} from "@/lib/strategy/documents/release-plan-model";
import { createClient } from "@/lib/supabase/server";

export const VISUALS_BUCKET = "document-visuals";
const SIGNED_URL_SECONDS = 3600;

export type VisualCandidate = {
  visual: Visual;
  key: string;
  // A URL to show it in the generator (signed, short-lived; never stored).
  previewUrl: string;
  group: "artist" | "project" | "uploads" | "references";
};

export type ReleasePlanLock = "needsBrief" | "pending" | null;

/**
 * Why the generator cannot write now, or null: it starts from a validated
 * Brief de sortie, never while a Brief version waits for its reviewers (the
 * database refuses the same in create_strategy_document).
 */
export function releasePlanLock(docs: StrategyDocuments): ReleasePlanLock {
  if (!approvedOf(docs.documents, "brief")) return "needsBrief";
  if (sentOf(docs.documents, "brief")) return "pending";
  return null;
}

export const releasePlanVersions = (docs: StrategyDocuments) =>
  versionsOf(docs.documents, "release_plan").filter(
    (d) => d.state !== "superseded",
  );

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

/**
 * The project's artist (main artist of its first master, else its own) and
 * its masters, in order. Shared with the Dossier de presse.
 */
export async function projectArtist(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "artist:artists!projects_artist_same_org(id, name, picture_path, picture_url, bio, country_code, deezer_id, deezer_url), links:project_masters!project_masters_project_same_org(position, master_id, master:masters!project_masters_master_same_org(title, isrc, credits:master_artists!master_artists_master_same_org(position, artist:artists!master_artists_artist_same_org(id, name, picture_path, picture_url, bio, country_code, deezer_id, deezer_url))))",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!data)
    return {
      artist: null,
      masterIds: [] as string[],
      masters: [] as Array<{ title: string; isrc: string | null }>,
    };
  const links = [...data.links].sort(byPosition);
  const first = links[0]?.master;
  const credit = first ? [...first.credits].sort(byPosition)[0] : undefined;
  return {
    artist: credit?.artist ?? data.artist ?? null,
    masterIds: links.map((l) => l.master_id),
    masters: links.flatMap((l) =>
      l.master ? [{ title: l.master.title, isrc: l.master.isrc }] : [],
    ),
  };
}

/**
 * Every image the owner may allow in the document: the artist's picture,
 * the project's image files and its titles' artwork, the images dropped in
 * the generator and the visual references, each with a URL to show it.
 */
export async function visualCandidates(
  projectId: string,
  config: Pick<ReleasePlanConfig, "visuals">,
): Promise<VisualCandidate[]> {
  const supabase = await createClient();
  const { artist, masterIds } = await projectArtist(projectId);
  const [projectFiles, masterFiles, picture] = await Promise.all([
    supabase
      .from("project_files")
      .select("id, path, file_name")
      .eq("project_id", projectId)
      .like("mime", "image/%")
      .order("created_at", { ascending: false })
      .limit(40),
    masterIds.length
      ? supabase
          .from("master_files")
          .select("id, path, file_name")
          .in("master_id", masterIds)
          .eq("category", "artwork")
          .like("mime", "image/%")
          .order("created_at", { ascending: false })
          .limit(20)
      : null,
    artist?.picture_path
      ? signArtistPictures([artist.picture_path])
      : Promise.resolve(new Map<string, string>()),
  ]);

  const sign = async (
    bucket: string,
    rows: Array<{ id: string; path: string; file_name: string }>,
    source: "project_file" | "master_file",
  ): Promise<VisualCandidate[]> => {
    if (rows.length === 0) return [];
    const { data } = await supabase.storage.from(bucket).createSignedUrls(
      rows.map((r) => r.path),
      SIGNED_URL_SECONDS,
    );
    return rows.flatMap((r, i) => {
      const url = data?.[i]?.signedUrl;
      const visual: Visual = { source, id: r.id, name: r.file_name };
      return url
        ? [
            {
              visual,
              key: visualKey(visual),
              previewUrl: url,
              group: "project" as const,
            },
          ]
        : [];
    });
  };

  const artistUrl = artist?.picture_path
    ? picture.get(artist.picture_path)
    : artist?.picture_url;
  const own = (config.visuals ?? []).flatMap((visual): VisualCandidate[] => {
    if (visual.source === "upload")
      return [
        {
          visual,
          key: visualKey(visual),
          previewUrl: supabase.storage
            .from(VISUALS_BUCKET)
            .getPublicUrl(visual.path).data.publicUrl,
          group: "uploads",
        },
      ];
    if (visual.source === "reference")
      return [
        {
          visual,
          key: visualKey(visual),
          previewUrl: visual.url,
          group: "references",
        },
      ];
    return [];
  });

  return [
    ...(artist && artistUrl
      ? [
          {
            visual: {
              source: "artist_picture" as const,
              id: artist.id,
              name: artist.name,
            },
            key: `artist_picture:${artist.id}`,
            previewUrl: artistUrl,
            group: "artist" as const,
          },
        ]
      : []),
    ...(await sign(
      FILE_BUCKETS.master,
      masterFiles?.data ?? [],
      "master_file",
    )),
    ...(await sign(
      FILE_BUCKETS.project,
      projectFiles.data ?? [],
      "project_file",
    )),
    ...own,
  ];
}

/** The generator's saved choices (empty when none). */
export async function loadReleasePlanConfig(
  projectId: string,
): Promise<ReleasePlanConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_document_drafts")
    .select("config")
    .eq("project_id", projectId)
    .eq("kind", "release_plan")
    .maybeSingle();
  return releasePlanConfigOf(data?.config);
}

/** The step in the URL, kept within the generator's eight steps. */
export function stepOf(raw: string | string[] | undefined): number {
  const value = Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? ""), 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 8) : 1;
}
