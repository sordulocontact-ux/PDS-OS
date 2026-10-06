"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { transcriptSchema } from "@/lib/ai/schemas/transcript";
import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadMasterBrief } from "@/lib/master-workflow/brief";
import type { BriefProposal } from "@/lib/master-workflow/brief-proposals";
import { masterBriefVoice } from "@/lib/master-workflow/voice";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { DictationResponse } from "@/lib/voice/constants";
import { proposeFrom } from "@/lib/voice/engine";

const exchangeSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  occurredAt: z.iso.datetime({ offset: true }),
  // A video link (Meet, Zoom…): https only, as the database checks.
  meetingUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null)
    .refine((value) => value === null || /^https:\/\/\S+$/.test(value)),
});

/**
 * "Préparer un échange": a call of the project whose agenda lists what the
 * Brief Mix/Master still lacks (built by code), created and linked in one
 * transaction by the database (create_master_exchange, owner only). Opens
 * the call, where it is recorded and processed like any other.
 */
export async function prepareMasterExchange(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.masterWorkflow.brief.errors;
  const parsed = exchangeSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    occurredAt: formData.get("occurredAt"),
    meetingUrl: formData.get("meetingUrl") ?? "",
  });
  if (!parsed.success)
    return {
      status: "error",
      formError: fr.calls.errors.invalid_input,
      values: Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, String(value)]),
      ),
    };
  const { projectId, title, occurredAt, meetingUrl } = parsed.data;

  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project) return { status: "error", formError: t.failed };
  // The agenda from what the brief lacks, read as the page reads it.
  const { nextAgenda } = await loadMasterBrief(project, access);

  const supabase = await createClient();
  const { data: callId, error } = await supabase.rpc("create_master_exchange", {
    p_project_id: projectId,
    p_title: title,
    p_occurred_at: occurredAt,
    p_meeting_url: meetingUrl ?? "",
    p_agenda: nextAgenda,
  });
  if (error || !callId) {
    console.error("prepareMasterExchange:", error?.code, error?.message);
    return {
      status: "error",
      formError: error?.code === "42501" ? t.forbidden : t.failed,
    };
  }
  redirect(routes.projectCall(projectId, callId));
}

// What the review shows under "Entendu": the start of what was said, as for
// a dictation (a call is longer: its first words only).
const EXCERPT_LENGTH = 400;
const excerpt = (text: string) => {
  const trimmed = text.trim();
  return trimmed.length <= EXCERPT_LENGTH
    ? trimmed
    : `${trimmed.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
};

/**
 * What an exchange's transcript proposes for the Brief Mix/Master: the same
 * extraction and checks as a dictation (lib/master-workflow/voice.ts), from
 * the call's text. Writes nothing; the owner reviews, then applies.
 */
export async function proposeBriefFromCall(
  projectId: string,
  callId: string,
): Promise<DictationResponse<BriefProposal>> {
  const ids = z.object({ projectId: z.uuid(), callId: z.uuid() }).safeParse({
    projectId,
    callId,
  });
  if (!ids.success) return { ok: false, error: "invalid_input" };
  await requireApproved();

  const supabase = await createClient();
  const [owner, link, transcript] = await Promise.all([
    supabase.rpc("is_project_owner", { p_project_id: ids.data.projectId }),
    supabase
      .from("master_brief_calls")
      .select("call:calls!master_brief_calls_call_same_org(title)")
      .eq("project_id", ids.data.projectId)
      .eq("call_id", ids.data.callId)
      .maybeSingle(),
    supabase
      .from("transcripts")
      .select("text, segments")
      .eq("call_id", ids.data.callId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  // Only the owner writes the brief: refused before paying for a model.
  if (!owner.data) return { ok: false, error: "forbidden" };
  if (!link.data?.call) return { ok: false, error: "not_found" };
  const parsed = transcriptSchema.safeParse(transcript.data);
  if (!parsed.success || parsed.data.text.trim() === "")
    return { ok: false, error: "nothing_heard" };

  return proposeFrom(
    masterBriefVoice,
    ids.data.projectId,
    parsed.data,
    excerpt(parsed.data.text),
  );
}
