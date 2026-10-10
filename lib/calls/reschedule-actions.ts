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
 * Moves or stretches a call in the calendar (drag, resize, « Modifier
 * l'horaire »), as in Teams. Only whoever works on it (RLS: is_call_owner),
 * and only before anything is recorded. Its Google event follows, and Google
 * tells the guests; Google refusing never undoes the move.
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
  const { data, error } = await supabase
    .from("calls")
    .update({ occurred_at: start.toISOString(), ends_at: end.toISOString() })
    .eq("id", callId)
    .is("audio_path", null)
    .select("google_event_id");
  if (error || !data?.length) {
    if (error) console.error("[calls] reschedule failed:", error.message);
    return { ok: false, error: "forbidden" };
  }
  let googleFailed = false;
  const eventId = data[0].google_event_id;
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
