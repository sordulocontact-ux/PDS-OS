"use server";

import { z } from "zod";

import { transcriptSchema } from "@/lib/ai/schemas/transcript";
import { requireApproved } from "@/lib/auth/dal";
import type { BriefProposal } from "@/lib/master-workflow/brief-proposals";
import { masterBriefVoice } from "@/lib/master-workflow/voice";
import { createClient } from "@/lib/supabase/server";
import type { DictationResponse } from "@/lib/voice/constants";
import { proposeFrom } from "@/lib/voice/engine";

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
