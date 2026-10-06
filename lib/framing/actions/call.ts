"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { assessFraming } from "@/lib/framing/assess";
import { framingCallTopics } from "@/lib/framing/call-prep";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
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
  // The topics PO prepared that the person kept, by dimension.
  dimensions: json(z.array(z.enum(DIMENSIONS)).max(DIMENSIONS.length)),
  // « Préparer en détail »: the questions go with each topic.
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(z.array(z.string().trim().min(1).max(200)).max(10)),
  participants: json(z.array(z.string().trim().min(1).max(120)).max(30)),
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
    detailed: values.detailed ?? "0",
  });
  if (!parsed.success)
    return {
      status: "error",
      formError: fr.calls.errors.invalid_input,
      values,
    };
  const p = parsed.data;

  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(p.projectId, access);
  if (!knowledge) return { status: "error", formError: t.failed, values };
  const kept = new Set(p.dimensions);
  const agenda = [
    ...framingCallTopics(assessFraming(knowledge))
      .filter((topic) => kept.has(topic.dimension))
      .map((topic) => ({
        topic: topic.topic,
        minutes: topic.minutes,
        ...(p.detailed ? { questions: topic.questions } : {}),
      })),
    ...p.extraTopics.map((topic) => ({ topic, minutes: 5 })),
  ];

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_framing_call", {
    p_project_id: p.projectId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.meetingUrl ?? "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map((name) => ({ name })),
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
  redirect(routes.projectCall(p.projectId, callId));
}
