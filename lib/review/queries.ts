import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  loadMembers,
  loadPendingValidation,
  type PendingValidation,
} from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

export type ReviewText = {
  results: string;
  worked: string;
  improve: string;
};

export type ReviewData = {
  stage: { id: string; state: string } | null;
  pendingValidation: PendingValidation | null;
  review: ReviewText;
  updated: { at: string; by: string | null } | null;
};

/** The project's review (Bilan) and its closing stage, with the user's
 * session. */
export async function loadReview(
  projectId: string,
  access: Access,
): Promise<ReviewData> {
  const supabase = await createClient();
  const [stageRes, reviewRes, members] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "review")
      .maybeSingle(),
    supabase
      .from("project_reviews")
      .select("results, worked, improve, updated_at, updated_by")
      .eq("project_id", projectId)
      .maybeSingle(),
    loadMembers(access),
  ]);
  const stage = stageRes.data
    ? { id: stageRes.data.id, state: stageRes.data.state }
    : null;
  const row = reviewRes.data;
  return {
    stage,
    pendingValidation: await loadPendingValidation(stage?.id ?? null, members),
    review: {
      results: row?.results ?? "",
      worked: row?.worked ?? "",
      improve: row?.improve ?? "",
    },
    updated: row
      ? {
          at: row.updated_at,
          by: members.find((m) => m.personId === row.updated_by)?.name ?? null,
        }
      : null,
  };
}
