"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import type { CallErrorCode } from "@/lib/calls/constants";
import { MAX_SLOT_MS } from "@/lib/calls/schedule";
import { moveMeetEvent } from "@/lib/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";

export type RescheduleResult =
  { ok: true; googleFailed: boolean } | { ok: false; error: CallErrorCode };

/**
 * Moves or stretches a call (the calendar's drag and resize, « Modifier
 * l'horaire » there and on the call's page), as in Teams. The database
 * decides who may (reschedule_call: whoever works on it, and whoever planned
 * a deal's call) and refuses once anything is recorded. Its Google event
 * follows, and Google tells the guests; Google refusing never undoes it.
 */
export async function rescheduleCall(
  callId: string,
  startIso: string,
  endIso: string,
): Promise<RescheduleResult> {
  const access = await getAccess();
  if (access.state !== "approved") return { ok: false, error: "unauthorized" };
  if (!z.uuid().safeParse(callId).success)
    return { ok: false, error: "invalid_input" };
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return { ok: false, error: "date_invalid" };
  if (end <= start) return { ok: false, error: "end_before_start" };
  if (end.getTime() - start.getTime() > MAX_SLOT_MS)
    return { ok: false, error: "slot_too_long" };

  const supabase = await createClient();
  const { data: eventId, error } = await supabase.rpc("reschedule_call", {
    p_call_id: callId,
    p_starts_at: start.toISOString(),
    p_ends_at: end.toISOString(),
  });
  if (error) {
    if (error.message === "invalid_slot")
      return { ok: false, error: "date_invalid" };
    console.error("[calls] reschedule failed:", error.message);
    return { ok: false, error: "forbidden" };
  }
  let googleFailed = false;
  if (eventId) {
    try {
      await moveMeetEvent({ eventId, start, end });
    } catch (googleError) {
      console.error("[calls] google move failed:", googleError);
      googleFailed = true;
    }
  }
  refresh();
  return { ok: true, googleFailed };
}
