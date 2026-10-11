import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PressKitState = {
  // The latest version and its state in the Stratégie's circuit.
  latest: { id: string; version: number; state: string } | null;
  // The latest approved one: the only one fit to send.
  approved: { id: string; version: number } | null;
};

/** The project's Dossier de presse, made and validated in the Stratégie
 * (strategy_documents) : never duplicated here. */
export async function loadPressKit(projectId: string): Promise<PressKitState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_documents")
    .select("id, version, state")
    .eq("project_id", projectId)
    .eq("kind", "press_kit")
    .order("version", { ascending: false });
  if (error) console.error("loadPressKit:", error.message);
  const live = (data ?? []).filter((d) => d.state !== "superseded");
  const approved = (data ?? []).find((d) => d.state === "approved");
  return {
    latest: live[0] ?? null,
    approved: approved ? { id: approved.id, version: approved.version } : null,
  };
}
