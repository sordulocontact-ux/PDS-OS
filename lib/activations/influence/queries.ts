import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The in-house objects of an influence activation : proposals and agreements
 * (budget readers only : RLS returns nothing to others), rights blocks,
 * contents with their feedback, payments. Cached per request.
 */
export const loadInfluenceData = cache(async (activationId: string) => {
  const supabase = await createClient();
  const [proposals, agreements, rights, contents, payments] = await Promise.all(
    [
      supabase
        .from("influence_proposals")
        .select("*")
        .eq("activation_id", activationId)
        .order("created_at"),
      supabase
        .from("influence_agreements")
        .select(
          "id, target_id, proposal_id, status, expires_at, displayed_at, identity_name, decided_at, comment, created_at",
        )
        .eq("activation_id", activationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("influence_rights")
        .select("*")
        .eq("activation_id", activationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("influence_contents")
        .select("*")
        .eq("activation_id", activationId)
        .order("created_at"),
      supabase
        .from("influence_payments")
        .select("*")
        .eq("activation_id", activationId),
    ],
  );
  const contentIds = (contents.data ?? []).map((c) => c.id);
  const feedback = contentIds.length
    ? await supabase
        .from("influence_feedback")
        .select(
          "id, content_id, timecode, category, comment, status, status_at, created_by, created_at",
        )
        .in("content_id", contentIds)
        .order("created_at")
    : { data: [], error: null };
  const failed = [proposals, agreements, rights, contents, payments, feedback]
    .map((r) => r.error)
    .find(Boolean);
  if (failed) console.error("loadInfluenceData:", failed.message);
  return {
    proposals: proposals.data ?? [],
    agreements: agreements.data ?? [],
    rights: rights.data ?? [],
    contents: contents.data ?? [],
    feedback: feedback.data ?? [],
    payments: payments.data ?? [],
  };
});

export type InfluenceData = Awaited<ReturnType<typeof loadInfluenceData>>;
