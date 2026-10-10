import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Where a deliverable's production stands (ticket, « États et transitions »:
// À préparer → Préproduction → Prête pour tournage → Tournage en cours →
// Tournage terminé → Postproduction → Contrôle final → Livrée → Transmise à
// Activations). Computed by code from what people recorded, never stored and
// never skipped: each phase reads its own evidence.
export const PRODUCTION_PHASES = [
  "to_prepare",
  "preproduction",
  "ready",
  "shooting",
  "shot",
  "post",
  "final_check",
  "delivered",
  "handed_off",
] as const;
export type ProductionPhase = (typeof PRODUCTION_PHASES)[number];

export type PhaseFacts = {
  sheet: boolean;
  readyAt: string | null;
  shootState: string | null;
  postStarted: boolean;
  versionApproved: boolean;
  delivered: boolean;
  handedOff: boolean;
};

/** Pure: the phase from the facts (client-safe logic, kept here with them). */
export function phaseOf(f: PhaseFacts): ProductionPhase {
  if (!f.sheet) return "to_prepare";
  // A hand-off counts only while the delivery it referenced stands.
  if (f.delivered) return f.handedOff ? "handed_off" : "delivered";
  if (f.versionApproved) return "final_check";
  if (f.postStarted) return "post";
  if (f.shootState === "done" || f.shootState === "partial") return "shot";
  if (f.shootState === "in_progress" || f.shootState === "interrupted")
    return "shooting";
  if (f.readyAt) return "ready";
  return "preproduction";
}

/** The facts of one sheet, read with the user's session. */
export async function loadPhaseFacts(
  supabase: Client,
  sheet: { id: string; readyAt: string | null } | null,
  deliverableId: string,
): Promise<PhaseFacts> {
  if (!sheet)
    return {
      sheet: false,
      readyAt: null,
      shootState: null,
      postStarted: false,
      versionApproved: false,
      delivered: false,
      handedOff: false,
    };
  const [shoot, steps, versions, delivery, handoffs] = await Promise.all([
    supabase
      .from("production_shoots")
      .select("state")
      .eq("sheet_id", sheet.id)
      .maybeSingle(),
    supabase
      .from("production_post_steps")
      .select("status")
      .eq("sheet_id", sheet.id)
      .neq("status", "todo")
      .limit(1),
    supabase
      .from("production_versions")
      .select("status")
      .eq("sheet_id", sheet.id),
    supabase
      .from("deliverable_deliveries")
      .select("delivered_at")
      .eq("deliverable_id", deliverableId)
      .maybeSingle(),
    supabase
      .from("production_activation_handoffs")
      .select("id")
      .eq("sheet_id", sheet.id)
      .limit(1),
  ]);
  const versionRows = versions.data ?? [];
  return {
    sheet: true,
    readyAt: sheet.readyAt,
    shootState: shoot.data?.state ?? null,
    postStarted:
      (steps.data ?? []).length > 0 ||
      versionRows.some((v) => v.status !== "draft"),
    versionApproved: versionRows.some((v) => v.status === "approved"),
    delivered: Boolean(delivery.data?.delivered_at),
    handedOff: (handoffs.data ?? []).length > 0,
  };
}
