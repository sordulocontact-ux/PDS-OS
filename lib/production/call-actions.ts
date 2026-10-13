"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { participantRow, participantSchema } from "@/lib/calls/participants";
import { buildAgenda } from "@/lib/calls/prepare";
import {
  extraTopicsSchema,
  topicMinutesSchema,
} from "@/lib/calls/prepare-schema";
import { fr } from "@/lib/i18n/fr";
import {
  CALL_FORMATS,
  PRODUCTION_CALL_TOPICS,
  productionCallTopics,
} from "@/lib/production/call-prep";
import { prepFailure } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
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
  deliverableId: z.uuid(),
  sheetId: z.uuid(),
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
  topics: json(
    z.array(z.enum(PRODUCTION_CALL_TOPICS)).max(PRODUCTION_CALL_TOPICS.length),
  ),
  // « Préparer en détail »: the questions go with each topic.
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(extraTopicsSchema),
  // The time the person gave PO's topics, by key.
  topicMinutes: json(topicMinutesSchema),
  participants: json(z.array(participantSchema).min(1).max(30)),
});

/**
 * « Créer l'échange » of a production sheet: a normal Call, with the agenda
 * PO prepared from what the preparation lacks (recomputed here from the
 * sheet, never sent by the client), the person's own topics, the
 * participants and the format. Nothing external happens: the call opens on
 * its page, where it is recorded. Turning its decisions into actions comes
 * later.
 */
export async function createProductionCall(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.productionCall;
  const values = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
  const parsed = callSchema.safeParse({
    ...values,
    meetingUrl: values.meetingUrl ?? "",
    detailed: values.detailed ?? "0",
    topicMinutes: values.topicMinutes || "{}",
  });
  if (!parsed.success)
    return {
      status: "error",
      formError: fr.calls.errors.invalid_input,
      values,
    };
  const p = parsed.data;

  const access = await requireApproved();
  const data = await loadProductionSheet(p.projectId, p.deliverableId, access);
  if (!data?.sheet || data.sheet.id !== p.sheetId)
    return { status: "error", formError: t.failed, values };
  if (!data.canOrganize)
    return {
      status: "error",
      formError: fr.productionPrep.errors.forbidden,
      values,
    };

  const agenda = buildAgenda(productionCallTopics(data), p);

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_production_call", {
    p_sheet_id: p.sheetId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.format === "video" ? (p.meetingUrl ?? "") : "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map(participantRow),
    p_format: p.format,
  });
  if (error || !callId) {
    const failure = error ? prepFailure(error) : null;
    return {
      status: "error",
      formError: failure && !failure.ok ? failure.error : t.failed,
      values,
    };
  }
  redirect(routes.projectCall(p.projectId, callId));
}
