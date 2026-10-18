"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  callId: z.uuid(),
  text: z.string().trim().min(1).max(10000),
});

type SendResult = { ok: true; notice?: string } | { ok: false; error: string };

/**
 * « Envoyer aux participants »: the message as the owner corrected it,
 * sent as the call's next version (send_call_summary). The recipients are
 * the call's participants as the server reads them, never a list from the
 * browser: the members are told in PDS OS (trigger), the others are kept
 * with their address — the e-mail itself is not wired yet, said as a notice.
 */
export async function sendMeetingSummary(input: {
  callId: string;
  text: string;
}): Promise<SendResult> {
  const t = fr.meeting.summary;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.messageMissing };
  const access = await requireApproved();
  const planned = await loadPlannedCall(parsed.data.callId);
  if (!planned) return { ok: false, error: t.failed };
  const recipients = planned.people
    .filter((p) => p.key !== `m:${access.personId}`)
    .map((p) => {
      const id = p.key.slice(2);
      return p.key.startsWith("m:")
        ? { name: p.name, how: "app", person_id: id }
        : p.key.startsWith("c:")
          ? {
              name: p.name,
              how: p.invite ?? "email",
              contact_id: id,
              email: p.email,
            }
          : { name: p.name, how: "email", email: p.email };
    });
  if (recipients.length === 0) return { ok: false, error: t.recipientsNone };

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_call_summary", {
    p_call_id: parsed.data.callId,
    p_text: parsed.data.text,
    p_recipients: recipients,
  });
  if (error) {
    console.error("sendMeetingSummary:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.failed,
    };
  }
  await schedulePendingPushes();
  if (planned.projectId)
    revalidatePath(routes.project(planned.projectId), "layout");
  return recipients.some((r) => r.how !== "app")
    ? { ok: true, notice: t.emailNotWired }
    : { ok: true };
}
