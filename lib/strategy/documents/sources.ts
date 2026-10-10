import "server-only";

import { getArtist } from "@/lib/catalog/artist-queries";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { siteUrl } from "@/lib/auth/site-url";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  strategySnapshotOf,
  type StrategySnapshot,
} from "@/lib/strategy/brief-snapshot";
import type { Visual } from "@/lib/strategy/documents/model";
import type { StrategyPageData } from "@/lib/strategy/page-data";
import { approvedOf } from "@/lib/strategy/workspace";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 3600;

export type VisualCandidate = Visual & {
  // A short-lived URL to show it in the generator (never stored).
  previewUrl: string;
  group: "artist" | "project" | "artistFiles";
};

export type DocumentSources = {
  // The validated Brief de sortie: what PO starts from, never asked again.
  brief: StrategySnapshot;
  briefVersion: number;
  artist: {
    id: string;
    name: string;
    // The team's biography, else Deezer's / Wikipedia's; null when none.
    bio: string | null;
  } | null;
  visuals: VisualCandidate[];
  // Where to listen, once the release was detected (Sortie).
  links: Array<{ label: string; url: string }>;
  owner: { name: string | null; email: string | null };
};

/** Null when no Brief de sortie is validated yet. */
export async function loadDocumentSources(
  page: StrategyPageData,
  { withBio = false }: { withBio?: boolean } = {},
): Promise<DocumentSources | null> {
  const approved = approvedOf(page.ctx.documents, "brief");
  const brief = approved ? strategySnapshotOf(approved.content) : null;
  if (!approved || !brief) return null;
  const { project } = page;
  const supabase = await createClient();
  const masterIds = project.masters.map((m) => m.id);

  const [artist, projectFiles, masterFiles, release, owner] = await Promise.all(
    [
      project.mainArtistId ? getArtist(project.mainArtistId) : null,
      supabase
        .from("project_files")
        .select("id, path, file_name")
        .eq("project_id", project.id)
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
      supabase
        .from("releases")
        .select(
          "smartlink_token, smartlink_enabled, release_links(platform, url)",
        )
        .eq("project_id", project.id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      project.ownerPersonId
        ? supabase
            .from("people")
            .select("email")
            .eq("id", project.ownerPersonId)
            .maybeSingle()
        : null,
    ],
  );

  const artistFiles = artist
    ? await supabase
        .from("artist_files")
        .select("id, path, file_name")
        .eq("artist_id", artist.id)
        .like("mime", "image/%")
        .order("created_at", { ascending: false })
        .limit(40)
    : null;

  const sign = async (
    bucket: string,
    rows: Array<{ id: string; path: string; file_name: string }>,
    source: Visual["source"],
    group: VisualCandidate["group"],
  ): Promise<VisualCandidate[]> => {
    if (rows.length === 0) return [];
    const { data } = await supabase.storage.from(bucket).createSignedUrls(
      rows.map((r) => r.path),
      SIGNED_URL_SECONDS,
    );
    return rows.flatMap((r, i) => {
      const url = data?.[i]?.signedUrl;
      return url
        ? [{ source, id: r.id, name: r.file_name, previewUrl: url, group }]
        : [];
    });
  };

  const visuals: VisualCandidate[] = [
    ...(artist?.pictureUrl
      ? [
          {
            source: "artist_picture" as const,
            id: artist.id,
            name: artist.name,
            previewUrl: artist.pictureUrl,
            group: "artist" as const,
          },
        ]
      : []),
    ...(await sign(
      FILE_BUCKETS.master,
      masterFiles?.data ?? [],
      "master_file",
      "project",
    )),
    ...(await sign(
      FILE_BUCKETS.project,
      projectFiles.data ?? [],
      "project_file",
      "project",
    )),
    ...(await sign(
      FILE_BUCKETS.artist,
      artistFiles?.data ?? [],
      "artist_file",
      "artistFiles",
    )),
  ];

  let bio: string | null = artist?.bio ?? null;
  if (withBio && artist && !bio && artist.deezerId) {
    const profile = await getArtistProfile(artist.deezerId);
    bio = profile?.bio?.text ?? null;
  }

  const platforms = fr.release.platforms as Record<string, string>;
  const r = release.data;
  const links = [
    ...(r?.smartlink_enabled && r.smartlink_token
      ? [
          {
            label: fr.strategyDocs.content.smartlink,
            url: `${siteUrl()}${routes.smartlink(r.smartlink_token)}`,
          },
        ]
      : []),
    ...(r?.release_links ?? []).map((l) => ({
      label: platforms[l.platform] ?? l.platform,
      url: l.url,
    })),
  ];

  return {
    brief,
    briefVersion: approved.version,
    artist: artist ? { id: artist.id, name: artist.name, bio } : null,
    visuals,
    links,
    owner: {
      name: project.ownerName,
      email: owner?.data?.email ?? null,
    },
  };
}
