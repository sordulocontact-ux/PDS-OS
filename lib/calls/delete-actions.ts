"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { callPage } from "@/lib/i18n/fr/calls-page";
import { cancelMeetEvent } from "@/lib/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * Deletes a meeting or a call for good, with the user's session: the SQL
 * function delete_call (20261107180101) lets the director and whoever
 * works on the call (lib/calls/delete-rule.ts) do it, takes what belongs to
 * the call with it and refuses a call still used. Its Google event is
 * cancelled after.
 */
export async function deleteCall(callId: string): Promise<WriteResult> {
  const t = callPage.delete;
  if (!z.uuid().safeParse(callId).success)
    return { ok: false, error: t.errors.not_found };
  await requireApproved();

  const supabase = await createClient();
  const { data: call } = await supabase
    .from("calls")
    .select("google_event_id, ends_at")
    .eq("id", callId)
    .maybeSingle();
  const { error } = await supabase.rpc("delete_call", { p_call_id: callId });
  if (error) {
    if (error.code === "42501" || error.message.includes("forbidden"))
      return { ok: false, error: t.errors.forbidden };
    if (error.message.includes("not_found"))
      return { ok: false, error: t.errors.not_found };
    if (error.message.includes("call_in_use"))
      return { ok: false, error: t.errors.in_use };
    console.error("deleteCall:", error.message);
    return { ok: false, error: t.errors.generic };
  }
  // Its Google event goes too, so the guests' agendas forget it (a call
  // still to come only); Google refusing never undoes the delete.
  if (
    call?.google_event_id &&
    (!call.ends_at || new Date(call.ends_at) > new Date())
  ) {
    try {
      await cancelMeetEvent(call.google_event_id);
    } catch (googleError) {
      console.error("deleteCall: google cancel failed:", googleError);
    }
  }
  revalidatePath(routes.app, "layout");
  return { ok: true, done: t.done };
}
