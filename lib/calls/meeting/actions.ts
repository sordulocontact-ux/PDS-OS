"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { emailMessage } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { summaryPdf } from "@/lib/calls/meeting/summary-pdf";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import type { EmailAttachment } from "@/lib/email/send";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  callId: z.uuid(),
  text: z.string().trim().min(1).max(10000),
});

type SendResult =
  { ok: true; notice?: string; done?: string } | { ok: false; error: string };

/**
 * « Envoyer aux participants »: the message as the owner corrected it,
 * sent as the call's next version (send_call_summary). The recipients are
 * the call's participants as the server reads them, never a list from the
 * browser: the members are told in PDS OS (trigger), the others are kept
 * with their address. The outside guests with an address are e-mailed the
 * message by PDS OS itself (Sacha, 05/11/2026), one e-mail each; those it
 * cannot reach (no address, error) are said as a notice, the message to be
 * sent by hand (« Écrire l'e-mail »).
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
  const outside = recipients.filter((r) => r.how !== "app");
  if (outside.length === 0) return { ok: true };
  const title = planned.projectId
    ? await projectTitleOf(planned.projectId)
    : planned.title;
  // The report as a PDF, joined to each e-mail (Sacha 05/11/2026); made
  // once, and the e-mails still leave if it cannot be made.
  const attachments = await summaryAttachment(supabase, {
    project: planned.projectId ? title : null,
    call: planned.title,
    occurredAt: planned.occurredAt,
    participants: planned.people.map((p) => p.name),
    text: parsed.data.text,
    sentBy:
      [access.firstName, access.lastName].filter(Boolean).join(" ") || null,
    callId: parsed.data.callId,
    needed: outside.some((r) => r.how === "email" && r.email),
  });
  const reached: string[] = [];
  for (const r of outside) {
    // « link »: their private page, not an e-mail of the summary itself.
    const sent =
      r.how === "email" && r.email
        ? await emailMessage({
            to: { name: r.name, email: r.email },
            subject: t.emailSubject(title, planned.title),
            text: parsed.data.text,
            attachments,
          })
        : "disabled";
    if (sent === "sent") reached.push(r.name);
  }
  if (reached.length === outside.length)
    return { ok: true, done: t.emailSent(reached) };
  return {
    ok: true,
    notice: reached.length > 0 ? t.emailPartial(reached) : t.emailNotWired,
  };
}

/** The PDF of the summary just sent, as an attachment (or none). */
async function summaryAttachment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    project: string | null;
    call: string;
    occurredAt: string;
    participants: string[];
    text: string;
    sentBy: string | null;
    callId: string;
    needed: boolean;
  },
): Promise<EmailAttachment[] | undefined> {
  if (!input.needed) return undefined;
  const { data } = await supabase
    .from("call_summaries")
    .select("version, sent_at")
    .eq("call_id", input.callId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  try {
    const { name, pdf } = await summaryPdf({
      ...input,
      sentAt: data?.sent_at ?? new Date().toISOString(),
      version: data?.version ?? null,
    });
    return [{ filename: name, content: pdf, contentType: "application/pdf" }];
  } catch (error) {
    console.error(
      "sendMeetingSummary pdf:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return undefined;
  }
}
