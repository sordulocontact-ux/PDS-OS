"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { CALL_FORMATS, designCallTopics } from "@/lib/design/call-prep";
import { designCallTargets } from "@/lib/design/call-sheet-data";
import { loadConception } from "@/lib/design/conception";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
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
  // The Conception's deliverables the exchange is about.
  deliverableIds: json(z.array(z.uuid()).max(50)),
  // The topics PO prepared that the person kept: "direction" or an id.
  topics: json(z.array(z.string().min(1).max(64)).max(60)),
  // « Préparer en détail »: the questions go with each topic.
  detailed: z.enum(["0", "1"]).transform((v) => v === "1"),
  extraTopics: json(z.array(z.string().trim().min(1).max(200)).max(10)),
  participants: json(z.array(z.string().trim().min(1).max(120)).min(1).max(30)),
});

/**
 * « Créer l'échange »: a normal Call, with the agenda PO prepared from what
 * the chosen deliverables lack (recomputed here, never sent by the client),
 * the person's own topics, the participants, the format and the deliverables
 * it is about. Opens the call's page, where it is recorded; once processed,
 * its report feeds the Conception (lib/design/import-call.ts).
 */
export async function prepareDesignCall(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.conceptionCall;
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

  const [access, project] = await Promise.all([
    requireApproved(),
    getProject(p.projectId),
  ]);
  const data = project ? await loadConception(project, access) : null;
  if (!project || !data)
    return { status: "error", formError: t.failed, values };

  // Only deliverables of this Conception; the rest is dropped.
  const known = new Set(data.deliverables.map((d) => d.id));
  const deliverableIds = p.deliverableIds.filter((id) => known.has(id));
  const kept = new Set(p.topics);
  const agenda = [
    ...designCallTopics(designCallTargets(data), deliverableIds)
      .filter((topic) => kept.has(topic.key))
      .map(({ topic, minutes, questions }) => ({
        topic,
        minutes,
        ...(p.detailed ? { questions } : {}),
      })),
    ...p.extraTopics.map((topic) => ({ topic, minutes: EXTRA_TOPIC_MINUTES })),
  ];

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_design_call", {
    p_project_id: p.projectId,
    p_title: p.title,
    p_occurred_at: p.occurredAt,
    p_meeting_url: p.format === "video" ? (p.meetingUrl ?? "") : "",
    p_agenda: agenda,
    p_purpose: p.purpose,
    p_participants: p.participants.map((name) => ({ name })),
    p_format: p.format,
    p_deliverable_ids: deliverableIds,
  });
  if (error || !callId) {
    console.error("prepareDesignCall:", error?.code, error?.message);
    return {
      status: "error",
      formError:
        error?.code === "42501"
          ? fr.conception.errors.forbidden
          : error?.message.includes("stage_locked")
            ? t.locked
            : t.failed,
      values,
    };
  }
  redirect(routes.projectCall(p.projectId, callId));
}
