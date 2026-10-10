"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { inviteProjectTeam } from "@/lib/calls/invite";
import { participantRow, participantSchema } from "@/lib/calls/participants";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import {
  CALL_FORMATS,
  STRATEGY_TOPICS,
  strategyCallTopics,
} from "@/lib/strategy/call-prep";
import { loadBudget } from "@/lib/budget/queries";
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
  format: z.enum(CALL_FORMATS),
  meetingUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null)
    .refine((value) => value === null || /^https:\/\/\S+$/.test(value)),
  purpose: z.string().trim().min(1).max(500),
  // The topics PO prepared that the person kept.
  topics: json(z.array(z.enum(STRATEGY_TOPICS)).max(STRATEGY_TOPICS.length)),
  // « Préparer en détail »: the questions go with each topic.
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(z.array(z.string().trim().min(1).max(200)).max(10)),
  participants: json(z.array(participantSchema).min(1).max(30)),
});

/**
 * « Créer l'échange »: a normal Call, with the agenda PO prepared from what
 * the Stratégie lacks (recomputed here, never sent by the client), the person's own topics, the participants and the
 * format. Opens the call's page, where it is recorded; once processed, its
 * report fills the Stratégie (lib/strategy/import-report.ts).
 */
export async function prepareStrategyCall(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.strategyEntry.call;
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
  const [data, budget] = await Promise.all([
    loadStrategy(p.projectId, access),
    loadBudget(p.projectId),
  ]);
  if (!data) return { status: "error", formError: t.failed, values };
  const kept = new Set(p.topics);
  const agenda = [
    ...strategyCallTopics({ ...data, budgetLines: budget.lines })
      .filter((topic) => kept.has(topic.key))
      .map(({ topic, minutes, questions }) => ({
        topic,
        minutes,
        ...(p.detailed ? { questions } : {}),
      })),
    ...p.extraTopics.map((topic) => ({ topic, minutes: EXTRA_TOPIC_MINUTES })),
  ];

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_strategy_call", {
    p_project_id: p.projectId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.format === "video" ? (p.meetingUrl ?? "") : "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map(participantRow),
    p_format: p.format,
  });
  if (error || !callId) {
    console.error("prepareStrategyCall:", error?.code, error?.message);
    return {
      status: "error",
      formError:
        error?.code === "42501"
          ? fr.framing.errors.forbidden
          : error?.message.includes("stage_locked")
            ? t.locked
            : t.failed,
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
