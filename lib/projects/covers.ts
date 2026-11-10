import "server-only";

import { listMasterCovers } from "@/lib/catalog/covers";
import { PROJECT_COVER_BUCKET } from "@/lib/projects/cover-rules";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour: read at each render, never kept in a cache
// that outlives them.
const SIGNED_URL_SECONDS = 3600;

type CoverSource = {
  id: string;
  coverPath: string | null;
  // Its first title: the Catalogue's cover stands in for a missing image.
  firstMasterId: string | null;
};

/**
 * What each project shows as its cover, by project id: the image chosen
 * for it, else the cover of its first title in the Catalogue (what PDS OS
 * already knows), else nothing — the default visual (ProjectCover). `size`:
 * the small copy for a list, the original for the overview. Two reads at
 * most, whatever the number of projects; with the viewer's session.
 */
export async function projectCoverUrls(
  projects: CoverSource[],
  size: "thumb" | "full" = "thumb",
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const chosen = projects.filter((p) => p.coverPath);
  const fromTitles = projects.filter((p) => !p.coverPath && p.firstMasterId);
  const supabase = await createClient();

  const [signed, titleCovers] = await Promise.all([
    chosen.length > 0
      ? supabase.storage.from(PROJECT_COVER_BUCKET).createSignedUrls(
          chosen.map((p) => p.coverPath as string),
          SIGNED_URL_SECONDS,
        )
      : null,
    fromTitles.length === 0
      ? null
      : // One title: only its files; several: the whole Catalogue's, once.
        listMasterCovers(
          fromTitles.length === 1
            ? (fromTitles[0].firstMasterId ?? undefined)
            : undefined,
        ),
  ]);

  if (signed?.error)
    console.error("projectCoverUrls (sign):", signed.error.message);
  const byPath = new Map(
    (signed?.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl && !entry.error
        ? [[entry.path, entry.signedUrl] as const]
        : [],
    ),
  );
  for (const project of chosen) {
    const url = byPath.get(project.coverPath as string);
    if (url) urls.set(project.id, url);
  }
  for (const project of fromTitles) {
    const cover = titleCovers?.get(project.firstMasterId as string);
    if (cover)
      urls.set(project.id, size === "thumb" ? cover.thumbUrl : cover.fullUrl);
  }
  return urls;
}

/** A list's projects with the small copy of their cover (ProjectsTable). */
export async function withCovers<
  T extends CoverSource & { coverUrl?: string | null },
>(projects: T[]): Promise<T[]> {
  if (projects.length === 0) return projects;
  const urls = await projectCoverUrls(projects, "thumb");
  return projects.map((p) => ({ ...p, coverUrl: urls.get(p.id) ?? null }));
}
