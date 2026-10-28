"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { cancelMeetEvent } from "@/lib/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * « Annuler l'échange » (Sacha 28/10/2026): the framing exchange planned
 * but not held is removed by the database (cancel_framing_call: owner only,
 * nothing recorded), then its Google event is cancelled, and Google tells
 * the guests. Google refusing never brings the call back: it is said.
 */
export async function cancelFramingCall(
  projectId: string,
  callId: string,
): Promise<WriteResult> {
  const t = framingJourney.start.cancel;
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(callId).success
  )
    return { ok: false, error: t.errors.generic };
  await requireApproved();
  const supabase = await createClient();
  const { data: eventId, error } = await supabase.rpc("cancel_framing_call", {
    p_call_id: callId,
  });
  if (error) {
    console.error("[framing] cancel call:", error.message);
    return {
      ok: false,
      error: error.message.includes("call_recorded")
        ? t.errors.recorded
        : error.code === "42501"
          ? t.errors.forbidden
          : t.errors.generic,
    };
  }
  let notice: string | undefined;
  if (eventId) {
    try {
      await cancelMeetEvent(eventId);
    } catch (googleError) {
      console.error("[framing] google cancel failed:", googleError);
      notice = t.googleFailed;
    }
  }
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true, done: t.done, notice };
}
