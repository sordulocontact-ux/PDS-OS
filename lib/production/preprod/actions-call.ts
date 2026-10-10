"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import { CALL_FORMATS } from "@/lib/production/call-prep";
import { effectiveLogistics } from "@/lib/production/logistics";
import { prepFailure } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import { TECHNICAL_TOPICS, technicalCallTopics } from "./call-topics";
import { loadPreprod } from "./queries";

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
  topics: json(z.array(z.enum(TECHNICAL_TOPICS)).max(TECHNICAL_TOPICS.length)),
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(z.array(z.string().trim().min(1).max(200)).max(10)),
  participants: json(z.array(z.string().trim().min(1).max(120)).min(1).max(30)),
});

/**
 * « Créer l'échange » of the technical call: a production call whose agenda
 * PO prepared from what the preproduction leaves open — recomputed here
 * from the sheet, never sent by the client — plus the person's own topics.
 * Nothing external happens; the call opens on its page, where it is
 * recorded, and its report comes back here as proposals.
 */
export async function createTechnicalCall(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.productionPreprod.call;
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
  const data = await loadProductionSheet(p.projectId, p.deliverableId, access);
  if (!data?.sheet || data.sheet.id !== p.sheetId)
    return { status: "error", formError: t.failed, values };
  if (!data.canOrganize)
    return {
      status: "error",
      formError: fr.productionPrep.errors.forbidden,
      values,
    };
  const preprod = await loadPreprod(p.projectId, {
    ...data,
    sheet: data.sheet,
  });
  const logistics = effectiveLogistics(
    data.sheet.logistics,
    data.heritage.fiche,
  );

  const kept = new Set(p.topics);
  const agenda = [
    ...technicalCallTopics({ data, preprod, logistics })
      .filter((topic) => kept.has(topic.key))
      .map(({ topic, minutes, questions }) => ({
        topic,
        minutes,
        ...(p.detailed && questions.length ? { questions } : {}),
      })),
    ...p.extraTopics.map((topic) => ({ topic, minutes: EXTRA_TOPIC_MINUTES })),
  ];

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_production_call", {
    p_sheet_id: p.sheetId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.format === "video" ? (p.meetingUrl ?? "") : "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map((name) => ({ name })),
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
