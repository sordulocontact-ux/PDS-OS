import "server-only";

import { can, type Access } from "@/lib/auth/access";
import {
  DEAL_KINDS,
  isDealStage,
  type Deal,
  type DealEvent,
  type DealKind,
} from "@/lib/deals/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Read with the user's session: the database returns the deals the reader
// may see (BIZ 2), the context through read_deal_context (the project's
// name even to whoever does not see the project, never a contact).

const SELECT =
  "id, kind, stage, agreement_status, participation_id, project_id, artist_id, assignee_person_id, next_action, next_action_on, follow_up_on, abandon_reason, stage_changed_at, created_at, artist:artists!deals_artist_same_org(name), assignee:people!deals_assignee_person_id_fkey(first_name, last_name)";

type Row = {
  id: string;
  kind: string;
  stage: string;
  agreement_status: string | null;
  participation_id: string | null;
  project_id: string | null;
  artist_id: string | null;
  assignee_person_id: string | null;
  next_action: string | null;
  next_action_on: string | null;
  follow_up_on: string | null;
  abandon_reason: string | null;
  stage_changed_at: string;
  created_at: string;
  artist: { name: string } | null;
  assignee: { first_name: string; last_name: string | null } | null;
};

// read_deal_context: the generated type says every column is set; a deal
// without a project or a participation has nulls.
type Context = {
  deal_id: string;
  project_title: string | null;
  project_visible: boolean;
  project_owner_id: string | null;
  title_label: string | null;
  title_position: number | null;
  participation_status: string | null;
  contract_status: string | null;
};

const kindOf = (value: string): DealKind =>
  (DEAL_KINDS as readonly string[]).includes(value)
    ? (value as DealKind)
    : "music";

async function withContext(access: Access, rows: Row[]): Promise<Deal[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("read_deal_context", {
    p_deal_ids: rows.map((r) => r.id),
  });
  if (error) console.error("read_deal_context:", error.message);
  const context = new Map(
    ((data ?? []) as Context[]).map((c) => [c.deal_id, c]),
  );
  const me = access.personId;
  const director = can(access, "validate");
  return rows.flatMap((r): Deal[] => {
    if (!isDealStage(r.stage)) return [];
    const c = context.get(r.id);
    const open = r.stage !== "signed" && r.stage !== "abandoned";
    const owner =
      can(access, "pilot_projects") &&
      me !== null &&
      c?.project_owner_id === me;
    return [
      {
        id: r.id,
        kind: kindOf(r.kind),
        stage: r.stage,
        agreementStatus:
          r.agreement_status === "pending" || r.agreement_status === "validated"
            ? r.agreement_status
            : null,
        participationId: r.participation_id,
        projectId: r.project_id,
        projectTitle: c?.project_title ?? null,
        projectVisible: c?.project_visible ?? false,
        artistId: r.artist_id,
        artistName: r.artist?.name ?? null,
        titleLabel: c?.title_label ?? null,
        titlePosition: c?.title_position ?? null,
        participationStatus: c?.participation_status ?? null,
        contractStatus: c?.contract_status ?? null,
        assignee:
          r.assignee && r.assignee_person_id
            ? {
                id: r.assignee_person_id,
                name: personName(r.assignee.first_name, r.assignee.last_name),
              }
            : null,
        nextAction: r.next_action,
        nextActionOn: r.next_action_on,
        followUpOn: r.follow_up_on,
        abandonReason: r.abandon_reason,
        stageChangedAt: r.stage_changed_at,
        createdAt: r.created_at,
        canWrite:
          open &&
          (director ||
            (me !== null &&
              r.assignee_person_id === me &&
              can(access, "negotiate"))),
        canAssign: open && (director || owner),
        canDecide:
          director &&
          r.stage === "agreement" &&
          r.agreement_status === "pending",
      },
    ];
  });
}

/** Every deal the reader may see (BIZ 4), the latest moved first. */
export async function loadDeals(
  access: Access,
): Promise<{ deals: Deal[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(SELECT)
    .order("stage_changed_at", { ascending: false })
    .limit(500);
  if (error) console.error("loadDeals:", error.message);
  return {
    deals: await withContext(access, (data ?? []) as Row[]),
    error: Boolean(error),
  };
}

/** One deal, or null when the reader may not see it (« introuvable »). */
export async function loadDeal(
  access: Access,
  dealId: string,
): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(SELECT)
    .eq("id", dealId)
    .maybeSingle();
  if (error) console.error("loadDeal:", error.message);
  if (!data) return null;
  const [deal] = await withContext(access, [data as Row]);
  return deal ?? null;
}

/** A deal's journal, the latest first. */
export async function loadDealEvents(dealId: string): Promise<DealEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_events")
    .select(
      "id, kind, from_stage, to_stage, reason, detail, created_at, actor:people!deal_events_actor_person_id_fkey(first_name, last_name)",
    )
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) console.error("loadDealEvents:", error.message);
  // « Confié à … »: the assignees named by the journal.
  const assigneeOf = (detail: unknown) =>
    detail && typeof detail === "object" && "assignee" in detail
      ? String((detail as { assignee: unknown }).assignee ?? "")
      : "";
  const ids = [
    ...new Set((data ?? []).map((e) => assigneeOf(e.detail))),
  ].filter(Boolean);
  const { data: people } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", ids)
    : { data: [] };
  const names = new Map(
    (people ?? []).map((p) => [p.id, personName(p.first_name, p.last_name)]),
  );
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind as DealEvent["kind"],
    fromStage: isDealStage(e.from_stage) ? e.from_stage : null,
    toStage: isDealStage(e.to_stage) ? e.to_stage : null,
    reason: e.reason,
    detail:
      e.detail && typeof e.detail === "object" && !Array.isArray(e.detail)
        ? (e.detail as Record<string, unknown>)
        : {},
    assignee: names.get(assigneeOf(e.detail)) ?? null,
    actor: e.actor ? personName(e.actor.first_name, e.actor.last_name) : null,
    createdAt: e.created_at,
  }));
}
