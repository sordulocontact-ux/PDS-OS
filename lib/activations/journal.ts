import "server-only";

import type { JournalEntry } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

/** An activation's journal, newest first (append-only, written by the
 * database). An entry without actor came from a public link or the system. */
export async function loadActivationJournal(
  activationId: string,
  members: Member[],
  subjectId?: string,
): Promise<JournalEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("activation_events")
    .select("id, kind, note, actor, at")
    .eq("activation_id", activationId)
    .order("at", { ascending: false })
    .limit(200);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) console.error("loadActivationJournal:", error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    note: e.note,
    actorName: e.actor
      ? (members.find((m) => m.personId === e.actor)?.name ?? null)
      : null,
    at: e.at,
  }));
}
