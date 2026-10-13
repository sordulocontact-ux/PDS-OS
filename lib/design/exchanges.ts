import "server-only";

import type { ConceptionData } from "@/lib/design/conception";
import { createClient } from "@/lib/supabase/server";

// The creative exchanges of a release, as the Conception's home shows them
// (MKT-C2-05): each call held for the Conception, to come or past, its scope
// (the release, or some deliverables), and once its report is read, what it
// produced — decisions, open questions, actions, and PO's ideas, apart from
// the ideas a person confirmed. Counted by code, from the database.

export type DesignExchange = {
  callId: string;
  title: string;
  occurredAt: string;
  // The call has not taken place yet (no recording, date to come).
  upcoming: boolean;
  // Empty: the whole release.
  deliverables: string[];
  report: {
    decisions: number;
    open: number;
    actions: number;
  } | null;
  ideas: { proposed: number; confirmed: number };
};

export type ExchangeData = {
  exchanges: DesignExchange[];
  // The project's calls not held for the Conception yet, to attach one.
  attachable: Array<{ id: string; title: string; occurredAt: string }>;
};

export async function loadDesignExchanges(
  projectId: string,
  data: Pick<ConceptionData, "deliverables" | "intentions" | "sources">,
): Promise<ExchangeData> {
  const supabase = await createClient();
  const [designCalls, projectCalls] = await Promise.all([
    supabase
      .from("design_calls")
      .select("call_id, deliverable_ids, calls(title, occurred_at, status)")
      .eq("project_id", projectId),
    supabase
      .from("calls")
      .select("id, title, occurred_at")
      .eq("project_id", projectId)
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);
  const held = designCalls.data ?? [];
  const ids = held.map((c) => c.call_id);
  const { data: reports } = ids.length
    ? await supabase
        .from("call_reports")
        .select("call_id, created_at, report_items(kind)")
        .in("call_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };
  const titleOf = new Map(data.deliverables.map((d) => [d.id, d.title]));
  const sourceOf = new Map(
    data.sources.flatMap((s) => (s.callId ? [[s.callId, s.id]] : [])),
  );
  const now = new Date().toISOString();

  const exchanges = held
    .map((c): DesignExchange => {
      const report = (reports ?? []).find((r) => r.call_id === c.call_id);
      const count = (kind: string) =>
        report?.report_items.filter((i) => i.kind === kind).length ?? 0;
      const source = sourceOf.get(c.call_id);
      const ideas = data.intentions.filter(
        (i) => source && i.sourceId === source,
      );
      return {
        callId: c.call_id,
        title: c.calls?.title ?? "",
        occurredAt: c.calls?.occurred_at ?? now,
        upcoming:
          !report &&
          c.calls?.status === "draft" &&
          (c.calls?.occurred_at ?? now) > now,
        deliverables: c.deliverable_ids.flatMap((id) => {
          const title = titleOf.get(id);
          return title ? [title] : [];
        }),
        report: report
          ? {
              decisions: count("decided"),
              open: count("open"),
              actions: count("next_action"),
            }
          : null,
        ideas: {
          proposed: ideas.filter((i) => i.status === "proposed").length,
          confirmed: ideas.filter((i) => i.status === "confirmed").length,
        },
      };
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const heldIds = new Set(ids);
  return {
    exchanges,
    attachable: (projectCalls.data ?? [])
      .filter((c) => !heldIds.has(c.id))
      .map((c) => ({ id: c.id, title: c.title, occurredAt: c.occurred_at })),
  };
}
