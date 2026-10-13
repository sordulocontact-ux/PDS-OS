import "server-only";

import {
  DESIGN_FILE_BUCKET,
  versionStatusOf,
  type VersionStatus,
} from "@/lib/design/rules";
import { personName } from "@/lib/projects/types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Signed URLs live one hour, as the artist files.
const SIGNED_URL_SECONDS = 3600;

export type DesignVersion = {
  id: string;
  deliverableId: string | null;
  number: number;
  kind: "file" | "link";
  fileName: string | null;
  bytes: number | null;
  // Link version: the https address; file version: a signed download URL.
  href: string | null;
  note: string | null;
  status: VersionStatus;
  reviewComment: string | null;
  // MKT-C2-10: the zone a retouche is about, and its task in the Travail.
  reviewScope: string | null;
  retouche: { done: boolean; assigneeName: string } | null;
  reviewerName: string;
  reviewedAt: string | null;
  authorPersonId: string | null;
  authorName: string;
  createdAt: string;
};

type RawPerson = { first_name: string | null; last_name: string | null } | null;
const nameOf = (p: RawPerson) =>
  p ? personName(p.first_name, p.last_name) : "";

/** Every version of the project, newest first, with the viewer's session. */
export async function listDesignVersions(
  supabase: Client,
  projectId: string,
): Promise<DesignVersion[]> {
  const { data, error } = await supabase
    .from("design_versions")
    .select(
      "id, deliverable_id, number, kind, path, file_name, bytes, url, note, status, review_comment, review_scope, reviewed_at, created_by, created_at, author:people!design_versions_created_by_fkey(first_name, last_name), reviewer:people!design_versions_reviewed_by_fkey(first_name, last_name), tasks(status, assignee:people!tasks_assignee_person_id_fkey(first_name, last_name))",
    )
    .eq("project_id", projectId)
    .order("number", { ascending: false });
  if (error) {
    console.error("listDesignVersions:", error.message);
    return [];
  }

  const bucket = supabase.storage.from(DESIGN_FILE_BUCKET);
  return Promise.all(
    (data ?? []).map(async (row): Promise<DesignVersion> => {
      let href = row.url;
      if (row.kind === "file" && row.path) {
        const signed = await bucket.createSignedUrl(
          row.path,
          SIGNED_URL_SECONDS,
          { download: row.file_name ?? true },
        );
        if (signed.error)
          console.error("listDesignVersions (sign):", signed.error.message);
        href = signed.data?.signedUrl ?? null;
      }
      return {
        id: row.id,
        deliverableId: row.deliverable_id,
        number: row.number,
        kind: row.kind === "file" ? "file" : "link",
        fileName: row.file_name,
        bytes: row.bytes,
        href,
        note: row.note,
        status: versionStatusOf(row.status),
        reviewComment: row.review_comment,
        reviewScope: row.review_scope,
        retouche: row.tasks[0]
          ? {
              done: row.tasks[0].status === "done",
              assigneeName: nameOf(row.tasks[0].assignee),
            }
          : null,
        reviewerName: nameOf(row.reviewer),
        reviewedAt: row.reviewed_at,
        authorPersonId: row.created_by,
        authorName: nameOf(row.author),
        createdAt: row.created_at,
      };
    }),
  );
}

export type DesignFile = DesignVersion & {
  // The deliverable's title; null = the creative direction.
  targetTitle: string | null;
};

/** Versions of the project with what they are for, for the Files page. */
export async function listDesignFiles(
  supabase: Client,
  projectId: string,
): Promise<DesignFile[]> {
  const [versions, deliverables] = await Promise.all([
    listDesignVersions(supabase, projectId),
    supabase
      .from("strategy_deliverables")
      .select("id, title")
      .eq("project_id", projectId),
  ]);
  const titles = new Map((deliverables.data ?? []).map((d) => [d.id, d.title]));
  return versions
    .map((v) => ({
      ...v,
      targetTitle: v.deliverableId
        ? (titles.get(v.deliverableId) ?? null)
        : null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
