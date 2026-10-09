"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { assessStrategy } from "@/lib/strategy/assess";
import { strategyCallTopics } from "@/lib/strategy/call-prep";
import { STRATEGY_DIMENSIONS } from "@/lib/strategy/dimensions";
import { loadStrategy } from "@/lib/strategy/queries";
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
  dimensions: json(
    z.array(z.enum(STRATEGY_DIMENSIONS)).max(STRATEGY_DIMENSIONS.length),
  ),
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(z.array(z.string().trim().min(1).max(200)).max(10)),
  participants: json(z.array(z.string().trim().min(1).max(120)).max(30)),
  documentIds: json(z.array(z.uuid()).max(30)),
});

/**
 * « Lancer » a strategy exchange: a normal Call with the agenda prepared from
 * what the Strategy lacks (recomputed here, never sent by the client). After
 * the call, its report fills the dimensions it speaks of (proposals to
 * confirm), like any call of the project.
 */
export async function prepareStrategyCall(
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
  const data = await loadStrategy(p.projectId, access);
  if (!data) return { status: "error", formError: t.failed, values };
  const kept = new Set(p.dimensions);
  const agenda = [
    ...strategyCallTopics(assessStrategy(data))
      .filter((topic) => kept.has(topic.dimension))
      .map((topic) => ({
        topic: topic.topic,
        minutes: topic.minutes,
        ...(p.detailed ? { questions: topic.questions } : {}),
      })),
    ...p.extraTopics.map((topic) => ({ topic, minutes: 5 })),
  ];

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_strategy_call", {
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
    console.error("prepareStrategyCall:", error?.code, error?.message);
    return {
      status: "error",
      formError:
        error?.code === "42501" ? fr.framing.errors.forbidden : t.failed,
      values,
    };
  }
  redirect(routes.projectCall(p.projectId, callId));
}
