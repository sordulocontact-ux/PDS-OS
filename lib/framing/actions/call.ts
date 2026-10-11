"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { inviteProjectTeam } from "@/lib/calls/invite";
import { participantRow, participantSchema } from "@/lib/calls/participants";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const json = <T extends z.ZodType>(schema: T) =>
  z.string().transform((raw, ctx): z.infer<T> => {
    try {
      const parsed = schema.safeParse(JSON.parse(raw || "[]"));
      if (parsed.success) return parsed.data;
    } catch {
      // fall through
    }
    ctx.addIssue({ code: "custom", message: "invalid" });
    return z.NEVER;
  });

const callSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  occurredAt: z.iso.datetime({ offset: true }),
  meetingUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null)
    .refine((value) => value === null || /^https:\/\/\S+$/.test(value)),
  purpose: z.string().trim().min(1).max(500),
  // The agenda as the person edited it from PO's draft (PROJ-UX-03): points,
  // durations, questions and the Cadrage dimension each point feeds.
  agenda: json(
    z
      .array(
        z.object({
          topic: z.string().trim().min(1).max(200),
          minutes: z.number().int().min(1).max(240),
          questions: z
            .array(z.string().trim().min(1).max(300))
            .max(20)
            .optional(),
          dimension: z.enum(DIMENSIONS).optional(),
        }),
      )
      .max(20),
  ),
  participants: json(z.array(participantSchema).max(30)),
  documentIds: json(z.array(z.uuid()).max(30)),
});

/**
 * « Lancer » (ticket § 5): the call, a normal Call, with the agenda PO
 * prepared from what the Cadrage lacks (recomputed here, never sent by the
 * client), the person's own topics, the participants and documents. Opens
 * the call's page, where it is recorded and processed like any other.
 */
export async function prepareFramingCall(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.framingIntel.call;
  const values = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
  const parsed = callSchema.safeParse({
    ...values,
    meetingUrl: values.meetingUrl ?? "",
  });
  if (!parsed.success)
    return {
      status: "error",
      formError: fr.calls.errors.invalid_input,
      values,
    };
  const p = parsed.data;

  const access = await requireApproved();
  // The person's own agenda: written by them, from PO's draft; the total is
  // its sum (create_framing_call), never typed.
  const agenda = p.agenda;
  if (agenda.reduce((sum, item) => sum + item.minutes, 0) > 12 * 60)
    return { status: "error", formError: t.failed, values };

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_framing_call", {
    p_project_id: p.projectId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.meetingUrl ?? "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map(participantRow),
    p_document_ids: p.documentIds,
  });
  if (error || !callId) {
    console.error("prepareFramingCall:", error?.code, error?.message);
    return {
      status: "error",
      formError:
        error?.code === "42501" ? fr.framing.errors.forbidden : t.failed,
      values,
    };
  }
  // The team members kept among the participants are invited (notified).
  await inviteProjectTeam({
    callId,
    organizationId: access.organizationId!,
    projectId: p.projectId,
    mePersonId: access.personId,
    names: p.participants.map((person) => person.name),
  });
  redirect(routes.projectCall(p.projectId, callId));
}
