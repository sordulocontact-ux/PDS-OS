import "server-only";

import {
  ENGINEER_SIGNALS,
  type EngineerMessage,
} from "@/lib/master-workflow/engineer-messages";
import { createClient } from "@/lib/supabase/server";

export type TeamEngineerMessage = Omit<EngineerMessage, "status"> & {
  transmissionId: string;
  authorName: string | null;
  handledAt: string | null;
  // « Chez la direction » once the owner sent a delay to it.
  status: "open" | "escalated" | "handled" | null;
  outcome: "applied" | "kept" | "refused" | null;
  handledBy: string | null;
};

/**
 * The project's threads with its engineers (PROJ-AMEL-02), oldest first:
 * whoever sees the project reads them (RLS).
 */
export async function loadEngineerMessages(
  projectId: string,
): Promise<TeamEngineerMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_engineer_messages")
    .select(
      "id, transmission_id, stage, kind, author, body, delay_days, status, outcome, created_at, handled_at, people:author_person_id(first_name, last_name), handler:people!master_engineer_messages_handled_by_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .order("created_at");
  if (error) console.error("loadEngineerMessages:", error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    transmissionId: m.transmission_id,
    stage: m.stage === "mastering" ? "mastering" : "mix",
    kind: ENGINEER_SIGNALS.find((k) => k === m.kind) ?? "message",
    author: m.author === "team" ? "team" : "engineer",
    body: m.body,
    delayDays: m.delay_days,
    status:
      m.status === "open" || m.status === "handled" || m.status === "escalated"
        ? m.status
        : null,
    outcome:
      m.outcome === "applied" || m.outcome === "kept" || m.outcome === "refused"
        ? m.outcome
        : null,
    handledBy: m.handler
      ? [m.handler.first_name, m.handler.last_name].filter(Boolean).join(" ")
      : null,
    createdAt: m.created_at,
    handledAt: m.handled_at,
    authorName: m.people
      ? [m.people.first_name, m.people.last_name].filter(Boolean).join(" ")
      : null,
  }));
}
