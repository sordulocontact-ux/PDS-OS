import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import type { HandoffRecord } from "@/lib/production/delivery/queries";
import {
  handoffStaleness,
  type HandoffStaleness,
} from "@/lib/production/delivery/rules";
import { createClient } from "@/lib/supabase/server";

export type ActivationHandoff = HandoffRecord & {
  deliverableId: string;
  deliverableTitle: string;
  // Why the delivery no longer matches this transmission, or null.
  staleness: HandoffStaleness | null;
};

/**
 * Activations: the latest transmission of each deliverable from the
 * Production, checked against its current delivery (a replaced file or a
 * reopened delivery is flagged). Read with the user's session.
 */
export async function loadActivationHandoffs(
  projectId: string,
  access: Access,
): Promise<ActivationHandoff[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("production_activation_handoffs")
    .select(
      "id, deliverable_id, version_id, final_url, delivered_at, formats, constraints_note, confirmed_by, confirmed_at",
    )
    .eq("project_id", projectId)
    .order("confirmed_at", { ascending: false });
  if (error) console.error("loadActivationHandoffs:", error.message);
  if (!rows || rows.length === 0) return [];

  // Newest first: the first row of each deliverable is its latest.
  const seen = new Set<string>();
  const latest = rows.filter((h) => {
    if (seen.has(h.deliverable_id)) return false;
    seen.add(h.deliverable_id);
    return true;
  });
  const deliverableIds = latest.map((h) => h.deliverable_id);
  const versionIds = latest.flatMap((h) =>
    h.version_id ? [h.version_id] : [],
  );

  const [deliverablesRes, deliveriesRes, versionsRes, members] =
    await Promise.all([
      supabase
        .from("strategy_deliverables")
        .select("id, title")
        .in("id", deliverableIds),
      supabase
        .from("deliverable_deliveries")
        .select("deliverable_id, version_id, final_url, delivered_at")
        .in("deliverable_id", deliverableIds),
      versionIds.length > 0
        ? supabase
            .from("production_versions")
            .select("id, number")
            .in("id", versionIds)
        : Promise.resolve({ data: [] as { id: string; number: number }[] }),
      loadMembers(access),
    ]);

  return latest.map((h) => {
    const delivery = (deliveriesRes.data ?? []).find(
      (d) => d.deliverable_id === h.deliverable_id,
    );
    return {
      id: h.id,
      deliverableId: h.deliverable_id,
      deliverableTitle:
        (deliverablesRes.data ?? []).find((d) => d.id === h.deliverable_id)
          ?.title ?? "—",
      versionId: h.version_id,
      versionNumber:
        (versionsRes.data ?? []).find((v) => v.id === h.version_id)?.number ??
        null,
      finalUrl: h.final_url,
      deliveredAt: h.delivered_at,
      formats: h.formats,
      constraints: h.constraints_note,
      confirmedBy: h.confirmed_by
        ? (members.find((m) => m.personId === h.confirmed_by)?.name ?? "—")
        : null,
      confirmedAt: h.confirmed_at,
      staleness: handoffStaleness(
        {
          versionId: h.version_id,
          finalUrl: h.final_url,
          deliveredAt: h.delivered_at,
        },
        delivery
          ? {
              versionId: delivery.version_id,
              finalUrl: delivery.final_url,
              deliveredAt: delivery.delivered_at,
            }
          : null,
      ),
    };
  });
}
