import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  isClosureState,
  marketingStatus,
  type ClosureState,
  type MarketingStatus,
} from "@/lib/marketing/closure/status";
import { createClient } from "@/lib/supabase/server";

export type MarketingClosure = {
  id: string;
  reportId: string;
  state: ClosureState;
  requestNote: string | null;
  requestedByPersonId: string;
  requestedBy: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  comment: string | null;
  reservesCount: number | null;
  reopenedBy: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
};

/** The project's Marketing closings, newest first (RLS decides). */
export async function loadClosures(
  projectId: string,
  access: Access,
): Promise<MarketingClosure[]> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase
      .from("marketing_closures")
      .select(
        "id, report_id, state, request_note, requested_by, requested_at, decided_by, decided_at, decision_comment, reserves, reopened_by, reopened_at, reopen_reason",
      )
      .eq("project_id", projectId)
      .order("requested_at", { ascending: false }),
    loadMembers(access),
  ]);
  const nameOf = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
  return (data ?? []).flatMap((c) =>
    isClosureState(c.state)
      ? [
          {
            id: c.id,
            reportId: c.report_id,
            state: c.state,
            requestNote: c.request_note,
            requestedByPersonId: c.requested_by,
            requestedBy: nameOf(c.requested_by),
            requestedAt: c.requested_at,
            decidedBy: nameOf(c.decided_by),
            decidedAt: c.decided_at,
            comment: c.decision_comment,
            reservesCount: Array.isArray(c.reserves) ? c.reserves.length : null,
            reopenedBy: nameOf(c.reopened_by),
            reopenedAt: c.reopened_at,
            reopenReason: c.reopen_reason,
          },
        ]
      : [],
  );
}

export type MarketingStanding = {
  status: MarketingStatus;
  // Follow-ups and limits still running (arbitrated, not lifted).
  openFollowUps: number;
  closedAt: string | null;
};

/**
 * Where the Marketing stands, in one light reading (counts and states): the
 * workflow card, the chevrons and the whole project's closing page share it
 * within a request.
 */
export const loadMarketingStanding = cache(
  async (projectId: string): Promise<MarketingStanding> => {
    const supabase = await createClient();
    const [activations, reports, closures, followUps] = await Promise.all([
      supabase
        .from("marketing_activations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .is("archived_at", null),
      supabase
        .from("marketing_reports")
        .select("state")
        .eq("project_id", projectId),
      supabase
        .from("marketing_closures")
        .select("state, decided_at")
        .eq("project_id", projectId)
        .order("requested_at", { ascending: false }),
      supabase
        .from("marketing_reserves")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "arbitrated"),
    ]);
    const closureRows = (closures.data ?? []).flatMap((c) =>
      isClosureState(c.state)
        ? [{ state: c.state, decidedAt: c.decided_at }]
        : [],
    );
    const status = marketingStatus({
      activations: activations.count ?? 0,
      reports: reports.data ?? [],
      closures: closureRows,
    });
    return {
      status,
      openFollowUps: followUps.count ?? 0,
      closedAt:
        closureRows.find(
          (c) =>
            c.state === "closed_clean" || c.state === "closed_with_reserves",
        )?.decidedAt ?? null,
    };
  },
);
