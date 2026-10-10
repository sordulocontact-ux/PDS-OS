import "server-only";

import { routes } from "@/lib/auth/redirects";
import { asCallStatus, type CallStatus } from "@/lib/calls/constants";
import { isUpcoming } from "@/lib/calls/format";
import { createClient } from "@/lib/supabase/server";

/** A call prepared from one production sheet, as the panel lists it. */
export type ProductionCallSummary = {
  callId: string;
  title: string;
  occurredAt: string;
  status: CallStatus;
  // A draft dated in the future reads « À venir » (decided at load time).
  upcoming: boolean;
  href: string;
};

/**
 * The production calls of one sheet (production_calls joined to calls),
 * newest first, read with the user's session. Empty without a sheet.
 */
export async function loadProductionCalls(
  projectId: string,
  sheetId: string | null,
): Promise<ProductionCallSummary[]> {
  if (!sheetId) return [];
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("production_calls")
    .select("call_id")
    .eq("project_id", projectId)
    .eq("sheet_id", sheetId);
  if (error) console.error("loadProductionCalls:", error.code, error.message);
  const ids = (links ?? []).map((l) => l.call_id);
  if (ids.length === 0) return [];

  const { data: calls, error: callsError } = await supabase
    .from("calls")
    .select("id, title, occurred_at, status")
    .eq("project_id", projectId)
    .in("id", ids)
    .order("occurred_at", { ascending: false });
  if (callsError)
    console.error("loadProductionCalls:", callsError.code, callsError.message);
  const now = new Date();
  return (calls ?? []).map((c) => {
    const status = asCallStatus(c.status);
    return {
      callId: c.id,
      title: c.title,
      occurredAt: c.occurred_at,
      status,
      upcoming: isUpcoming({ status, occurredAt: c.occurred_at }, now),
      href: routes.projectCall(projectId, c.id),
    };
  });
}
