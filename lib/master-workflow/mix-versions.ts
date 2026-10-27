import "server-only";

import { fr } from "@/lib/i18n/fr";

import {
  MIX_DECISIONS,
  MIX_VERSION_STATUSES,
  type MixComment,
  type MixVersionStatus,
  type MixVersionsView,
  type VersionStage,
} from "@/lib/master-workflow/mix-types";
import { withDownloadName } from "@/lib/catalog/file-rules";
import { personName } from "@/lib/projects/types";
import {
  masterBriefRow,
  masterVersionRows,
  whereRows,
} from "@/lib/master-workflow/shared-rows";
import { createClient } from "@/lib/supabase/server";
import { argsKey, memoPerRequest } from "@/lib/utils/request-memo";

const name = (
  person: { first_name: string; last_name: string | null } | null,
) => (person ? personName(person.first_name, person.last_name) : null);

const SIGNED_URL_SECONDS = 3600;

const statusOf = (value: string): MixVersionStatus =>
  MIX_VERSION_STATUSES.find((status) => status === value) ?? "received";

/**
 * The versions of the mix of the project's titles (created by the database
 * when a "mix" audio file arrives) and what the team said of each, in one
 * round of two queries, with the viewer's session.
 */
async function readMixVersions(
  project: {
    id: string;
    ownerPersonId: string | null;
    ownerName: string | null;
    masters: Array<{ id: string; title: string }>;
  },
  viewerPersonId: string | null,
  stage: VersionStage,
): Promise<MixVersionsView> {
  const projectId = project.id;
  const titles = project.masters;
  const supabase = await createClient();
  const [versions, comments, brief] = await Promise.all([
    // Shared with the Master's other loaders in the same render
    // (lib/master-workflow/shared-rows.ts).
    whereRows(masterVersionRows(projectId), (v) => v.stage === stage),
    supabase
      .from("master_mix_comments")
      .select(
        "id, version_id, body, created_at, timecode_seconds, author:people!master_mix_comments_created_by_fkey(first_name, last_name), contact:network_contacts!master_mix_comments_contact_id_fkey(name)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    masterBriefRow(projectId),
  ]);
  if (versions.error || comments.error)
    console.error(
      "loadMixVersions:",
      versions.error?.message ?? comments.error?.message,
    );

  const commentsOf = new Map<string, MixComment[]>();
  for (const row of comments.data ?? []) {
    const list = commentsOf.get(row.version_id) ?? [];
    list.push({
      id: row.id,
      body: row.body,
      // Left by the artist through their private link (rule 21: it stays
      // in the team).
      author: row.contact
        ? fr.masterListen.viaLink(row.contact.name)
        : name(row.author),
      createdAt: row.created_at,
      timecodeSeconds: row.timecode_seconds,
    });
    commentsOf.set(row.version_id, list);
  }

  const deciderId = brief.data?.validator_person_id ?? project.ownerPersonId;
  const rows = versions.data ?? [];
  // Every version stays listenable and downloadable (PROJ-BUG-08), with the
  // viewer's session: the storage policies decide.
  const paths = rows.flatMap((row) => (row.file?.path ? [row.file.path] : []));
  const signed = paths.length
    ? await supabase.storage
        .from("master-files")
        .createSignedUrls(paths, SIGNED_URL_SECONDS)
    : { data: [], error: null };
  if (signed.error)
    console.error("loadMixVersions (sign):", signed.error.message);
  const urlOf = new Map(
    (signed.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
  return {
    stage,
    failed: Boolean(versions.error || comments.error),
    canDecide: viewerPersonId !== null && viewerPersonId === deciderId,
    decider: brief.data?.validator
      ? name(brief.data.validator)
      : project.ownerName,
    titles: titles.map((title) => ({
      masterId: title.id,
      title: title.title,
      finalNumber:
        rows.find(
          (row) => row.master_id === title.id && row.decision === "approved",
        )?.number ?? null,
      versions: rows
        .filter((row) => row.master_id === title.id)
        .map((row) => ({
          id: row.id,
          masterId: row.master_id,
          number: row.number,
          fileName: row.file?.file_name ?? "",
          openUrl: (row.file && urlOf.get(row.file.path)) ?? null,
          downloadUrl:
            row.file && urlOf.get(row.file.path)
              ? withDownloadName(urlOf.get(row.file.path)!, row.file.file_name)
              : null,
          createdAt: row.created_at,
          createdBy: name(row.author),
          status: statusOf(row.status),
          feedbackSummary: row.feedback_summary,
          feedbackSentAt: row.feedback_sent_at,
          decision:
            MIX_DECISIONS.find((decision) => decision === row.decision) ?? null,
          decisionNote: row.decision_note,
          decidedBy: name(row.decider),
          decidedAt: row.decided_at,
          comments: commentsOf.get(row.id) ?? [],
        })),
    })),
  };
}

// Once per request for the same project, viewer and stage (the workflow
// statuses and the Master's pages both read it, page loads audit).
export const loadMixVersions = memoPerRequest(argsKey, readMixVersions);
