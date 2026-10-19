import "server-only";

import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

/**
 * Who set an activation to a status, when and why (its journal, written by
 * the database): « Suspendue par Lina Haddad le 14/10 : « … » ».
 */
export async function lastStatusEvent(
  activationId: string,
  status: string,
  members: Member[],
): Promise<{ by: string | null; at: string; why: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activation_events")
    .select("actor, at, note, new_value")
    .eq("activation_id", activationId)
    .eq("kind", "activation.status")
    .order("at", { ascending: false })
    .limit(20);
  if (error) console.error("lastStatusEvent:", error.message);
  const event = (data ?? []).find(
    (e) =>
      e.new_value !== null &&
      typeof e.new_value === "object" &&
      !Array.isArray(e.new_value) &&
      e.new_value.status === status,
  );
  if (!event) return null;
  return {
    by: members.find((m) => m.personId === event.actor)?.name ?? null,
    at: event.at,
    why: event.note,
  };
}
