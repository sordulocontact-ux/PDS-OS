"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { participantRow, participantSchema } from "@/lib/calls/participants";
import { EXTRA_TOPIC_MINUTES } from "@/lib/calls/prepare";
import { CALL_FORMATS, designCallTopics } from "@/lib/design/call-prep";
import {
  designCallContext,
  designCallTargets,
} from "@/lib/design/call-sheet-data";
import { refreshConception } from "@/lib/design/actions/shared";
import { loadConception } from "@/lib/design/conception";
import { fillDesignFromCall } from "@/lib/design/import-call";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

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
  participants: json(z.array(participantSchema).min(1).max(30)),
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
  const context = await designCallContext(p.projectId);
  const agenda = [
    ...designCallTopics({ ...designCallTargets(data), context }, deliverableIds)
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
    p_participants: p.participants.map(participantRow),
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

const attachSchema = z.object({
  projectId: z.uuid(),
  callId: z.uuid(),
  purpose: z.string().trim().min(1).max(500),
  // Empty: the exchange is about the whole release.
  deliverableIds: z.array(z.uuid()).max(50),
});

/**
 * « Rattacher un call existant » (MKT-C2-05): a call of the project becomes
 * a creative exchange of the Conception, for the release or some
 * deliverables. Its report, if already processed, is read at once like a
 * prepared exchange's (fillDesignFromCall: PO proposes, a person confirms).
 * The owner only (RLS on design_calls).
 */
export async function attachDesignCall(
  input: z.input<typeof attachSchema>,
): Promise<WriteResult> {
  const t = fr.conceptionCall;
  const p = attachSchema.safeParse(input);
  if (!p.success) return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.from("design_calls").insert({
    organization_id: access.organizationId,
    project_id: p.data.projectId,
    call_id: p.data.callId,
    purpose: p.data.purpose,
    format: "video",
    deliverable_ids: p.data.deliverableIds,
  });
  if (error) {
    console.error("attachDesignCall:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? fr.conception.errors.forbidden
          : error.code === "23505"
            ? t.alreadyAttached
            : t.failed,
    };
  }
  await fillDesignFromCall(supabase, access, p.data.callId);
  refreshConception(p.data.projectId);
  return { ok: true };
}
