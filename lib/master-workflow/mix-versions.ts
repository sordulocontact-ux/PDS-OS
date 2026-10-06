import "server-only";

import {
  MIX_DECISIONS,
  MIX_VERSION_STATUSES,
  type MixComment,
  type MixVersionStatus,
  type MixVersionsView,
  type VersionStage,
} from "@/lib/master-workflow/mix-types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const name = (
  person: { first_name: string; last_name: string | null } | null,
) => (person ? personName(person.first_name, person.last_name) : null);

const statusOf = (value: string): MixVersionStatus =>
  MIX_VERSION_STATUSES.find((status) => status === value) ?? "received";

/**
 * The versions of the mix of the project's titles (created by the database
 * when a "mix" audio file arrives) and what the team said of each, in one
 * round of two queries, with the viewer's session.
 */
export async function loadMixVersions(
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
    supabase
      .from("master_mix_versions")
      .select(
        "id, master_id, number, status, feedback_summary, feedback_sent_at, decision, decision_note, decided_at, created_at, file:master_files!master_mix_versions_file_id_fkey(file_name), author:people!master_mix_versions_created_by_fkey(first_name, last_name), decider:people!master_mix_versions_decided_by_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .eq("stage", stage)
      .order("number", { ascending: false }),
    supabase
      .from("master_mix_comments")
      .select(
        "id, version_id, body, created_at, author:people!master_mix_comments_created_by_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("master_briefs")
      .select(
        "validator_person_id, validator:people!master_briefs_validator_person_id_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
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
      author: name(row.author),
      createdAt: row.created_at,
    });
    commentsOf.set(row.version_id, list);
  }

  const deciderId = brief.data?.validator_person_id ?? project.ownerPersonId;
  const rows = versions.data ?? [];
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
