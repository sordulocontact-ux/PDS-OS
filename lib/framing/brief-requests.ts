import "server-only";

import type { BriefRequest } from "@/lib/framing/brief-request-view";
import { isDimension, isQuestionKey } from "@/lib/framing/dimensions";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const nameOf = (
  person: { first_name: string; last_name: string | null } | null,
) => (person ? personName(person.first_name, person.last_name) : null);

/**
 * The validator's requests on a project's Brief (PROJ-UX-06), oldest first,
 * with who asked and who answered. Read with the user's session: RLS lets
 * the project and the validator see them.
 */
export async function loadBriefRequests(
  projectId: string,
): Promise<BriefRequest[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("framing_brief_requests")
    .select(
      "id, brief_id, dimension, question_key, body, mandatory, state, resolution, resolution_note, resolved_brief_id, created_at, resolved_at, author:people!framing_brief_requests_created_by_fkey(first_name, last_name), resolver:people!framing_brief_requests_resolved_by_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .order("created_at");
  if (error) {
    console.error("loadBriefRequests:", error.message);
    return null;
  }
  return (data ?? []).flatMap((row) =>
    isDimension(row.dimension)
      ? [
          {
            id: row.id,
            briefId: row.brief_id,
            dimension: row.dimension,
            questionKey: isQuestionKey(row.question_key)
              ? row.question_key
              : null,
            body: row.body,
            mandatory: row.mandatory,
            state: row.state as BriefRequest["state"],
            resolution: row.resolution as BriefRequest["resolution"],
            resolutionNote: row.resolution_note,
            resolvedBriefId: row.resolved_brief_id,
            createdAt: row.created_at,
            resolvedAt: row.resolved_at,
            authorName: nameOf(row.author),
            resolverName: nameOf(row.resolver),
          },
        ]
      : [],
  );
}
