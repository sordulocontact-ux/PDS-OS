import "server-only";

import type { Access } from "@/lib/auth/access";
import { listDesignVersions } from "@/lib/design/versions";
import {
  loadMembers,
  loadPendingValidation,
  type PendingValidation,
} from "@/lib/framing/related";
import {
  deliveryStateOf,
  type DeliveryState,
  type ProductionDeliveryRow,
} from "@/lib/production/rules";
import {
  loadConceptionLinks,
  type ConceptionLink,
} from "@/lib/production/conception-links";
import { createClient } from "@/lib/supabase/server";

export type ProductionDeliverable = {
  id: string;
  title: string;
  leverLabel: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  // The Conception's validated version: the creative source (ticket § 1).
  approvedDesign: { number: number; href: string | null } | null;
  // MKT-C2-13: what the Conception handed over, or why not.
  conception: ConceptionLink | null;
  // Its preparation is opened (production_sheets).
  prepared: boolean;
  delivery:
    | (ProductionDeliveryRow & {
        approvedBy: string | null;
        checkedBy: string | null;
        deliveredBy: string | null;
      })
    | null;
  state: DeliveryState;
};

export type ProductionData = {
  stage: { id: string; state: string } | null;
  pendingValidation: PendingValidation | null;
  deliverables: ProductionDeliverable[];
  counts: Record<DeliveryState, number>;
  isOwner: boolean;
  isCreative: boolean;
};

/** Everything the Production page shows, read with the user's session. */
export async function loadProduction(
  projectId: string,
  access: Access,
): Promise<ProductionData | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_person_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [
    stageRes,
    deliverablesRes,
    deliveriesRes,
    creativesRes,
    sheetsRes,
    versions,
    members,
  ] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "production")
      .maybeSingle(),
    supabase
      .from("strategy_deliverables")
      .select("id, title, assignee_person_id, due_date, levers(label)")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("deliverable_deliveries")
      .select(
        "deliverable_id, final_url, final_note, approved_at, approved_by, checked_at, checked_by, delivered_at, delivered_by",
      )
      .eq("project_id", projectId),
    supabase
      .from("project_creatives")
      .select("person_id")
      .eq("project_id", projectId),
    supabase
      .from("production_sheets")
      .select("deliverable_id")
      .eq("project_id", projectId),
    listDesignVersions(supabase, projectId),
    loadMembers(access),
  ]);
  const conception = await loadConceptionLinks(supabase, projectId);

  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;
  const stage = stageRes.data
    ? { id: stageRes.data.id, state: stageRes.data.state }
    : null;
  const prepared = new Set(
    (sheetsRes.data ?? []).map((row) => row.deliverable_id),
  );
  const deliveries = new Map(
    (deliveriesRes.data ?? []).map((row) => [row.deliverable_id, row]),
  );

  const deliverables = (deliverablesRes.data ?? []).map((d) => {
    // Newest first: the latest approved version.
    const approved = versions.find(
      (v) => v.deliverableId === d.id && v.status === "approved",
    );
    const row = deliveries.get(d.id);
    const delivery = row
      ? {
          finalUrl: row.final_url,
          finalNote: row.final_note,
          approvedAt: row.approved_at,
          checkedAt: row.checked_at,
          deliveredAt: row.delivered_at,
          approvedBy: nameOf(row.approved_by),
          checkedBy: nameOf(row.checked_by),
          deliveredBy: nameOf(row.delivered_by),
        }
      : null;
    return {
      id: d.id,
      title: d.title,
      leverLabel: d.levers?.label ?? null,
      assigneeName: nameOf(d.assignee_person_id),
      dueDate: d.due_date,
      approvedDesign: approved
        ? { number: approved.number, href: approved.href }
        : null,
      prepared: prepared.has(d.id),
      // MKT-C2-13: what the Conception handed over, or why not (null
      // while it handed nothing).
      conception: conception.get(d.id) ?? null,
      delivery,
      state: deliveryStateOf(delivery),
    };
  });

  const counts: Record<DeliveryState, number> = {
    no_file: 0,
    to_approve: 0,
    to_check: 0,
    to_deliver: 0,
    delivered: 0,
  };
  for (const d of deliverables) counts[d.state] += 1;
  const me = access.personId;

  return {
    stage,
    pendingValidation: await loadPendingValidation(stage?.id ?? null, members),
    deliverables,
    counts,
    isOwner: me !== null && project.owner_person_id === me,
    isCreative: (creativesRes.data ?? []).some((c) => c.person_id === me),
  };
}
