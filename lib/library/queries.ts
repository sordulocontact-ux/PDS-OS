import "server-only";

import { routes } from "@/lib/auth/redirects";
import {
  FILE_BUCKETS,
  withDownloadName,
  type FileOwnerKind,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The organization-wide library (/app/files): the latest version of every
// file the viewer may read, across artists, titles, projects and contracts.
// Read from the `library_files` view (security invoker: each table's RLS
// applies, contracts included).

export const LIBRARY_SOURCES = [
  "artist",
  "master",
  "project",
  "contract",
] as const satisfies readonly FileOwnerKind[];
export type LibrarySource = (typeof LIBRARY_SOURCES)[number];

export function asLibrarySource(value: unknown): LibrarySource | null {
  return LIBRARY_SOURCES.find((source) => source === value) ?? null;
}

export type LibraryFile = {
  id: string;
  source: LibrarySource;
  // What the file belongs to, and the page of its library.
  ownerLabel: string;
  ownerHref: string;
  categoryLabel: string;
  description: string | null;
  fileName: string;
  mime: string;
  bytes: number;
  version: number;
  versionCount: number;
  createdAt: string;
  authorName: string;
  openUrl: string | null;
  downloadUrl: string | null;
};

// Newest first; the team's volume stays far below it. Beyond, the page
// says the list is cut and the owner's own library has everything.
export const LIBRARY_LIMIT = 500;

const SIGNED_URL_SECONDS = 3600;

const OWNER_HREF: Record<LibrarySource, (id: string) => string> = {
  artist: routes.artistFiles,
  master: routes.masterFiles,
  project: routes.projectFiles,
  contract: routes.contract,
};

function isSource(value: string | null): value is LibrarySource {
  return asLibrarySource(value) !== null;
}

export async function listLibraryFiles(): Promise<{
  files: LibraryFile[];
  truncated: boolean;
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_files")
    .select(
      "id, source, owner_id, owner_label, category, description, path, file_name, mime, bytes, version, version_count, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIBRARY_LIMIT + 1);
  if (error) {
    console.error("listLibraryFiles:", error.message);
    return { files: [], truncated: false, error: true };
  }
  // A view's columns are all nullable in the generated types: keep the rows
  // that have what a file always has, typed as such.
  const rows = (data ?? []).flatMap((row) => {
    const { id, source, owner_id, path, file_name, mime, created_at } = row;
    return id &&
      owner_id &&
      path &&
      file_name &&
      mime &&
      created_at &&
      isSource(source)
      ? [
          {
            id,
            source,
            ownerId: owner_id,
            ownerLabel: row.owner_label ?? "",
            category: row.category ?? "other",
            description: row.description,
            path,
            fileName: file_name,
            mime,
            bytes: row.bytes ?? 0,
            version: row.version ?? 1,
            versionCount: row.version_count ?? 1,
            createdBy: row.created_by,
            createdAt: created_at,
          },
        ]
      : [];
  });
  const truncated = rows.length > LIBRARY_LIMIT;
  const shown = rows.slice(0, LIBRARY_LIMIT);
  if (shown.length === 0) return { files: [], truncated, error: false };

  // One signing request per bucket, and one read of the authors' names.
  const authorIds = [
    ...new Set(shown.flatMap((row) => (row.createdBy ? [row.createdBy] : []))),
  ];
  const [signed, authors] = await Promise.all([
    Promise.all(
      LIBRARY_SOURCES.map(async (source) => {
        const paths = shown
          .filter((row) => row.source === source)
          .map((row) => row.path);
        if (paths.length === 0) return [];
        const result = await supabase.storage
          .from(FILE_BUCKETS[source])
          .createSignedUrls(paths, SIGNED_URL_SECONDS);
        if (result.error)
          console.error("listLibraryFiles (sign):", result.error.message);
        return result.data ?? [];
      }),
    ),
    authorIds.length
      ? supabase
          .from("people")
          .select("id, first_name, last_name")
          .in("id", authorIds)
      : Promise.resolve({ data: [] }),
  ]);
  const urlOf = new Map(
    signed
      .flat()
      .flatMap((entry) =>
        entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
      ),
  );
  const nameOf = new Map(
    (authors.data ?? []).map((p) => [
      p.id,
      personName(p.first_name, p.last_name),
    ]),
  );

  const files = shown.map((row): LibraryFile => {
    const labels: Record<string, string> =
      fr.catalogFiles.categories[row.source];
    const openUrl = urlOf.get(row.path) ?? null;
    return {
      id: row.id,
      source: row.source,
      ownerLabel: row.ownerLabel,
      ownerHref: OWNER_HREF[row.source](row.ownerId),
      categoryLabel: labels[row.category] ?? labels.other,
      description: row.description,
      fileName: row.fileName,
      mime: row.mime,
      bytes: row.bytes,
      version: row.version,
      versionCount: row.versionCount,
      createdAt: row.createdAt,
      authorName: row.createdBy ? (nameOf.get(row.createdBy) ?? "") : "",
      openUrl,
      downloadUrl: openUrl && withDownloadName(openUrl, row.fileName),
    };
  });
  return { files, truncated, error: false };
}
