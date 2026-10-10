import "server-only";

import { getAudioUrl } from "@/lib/calls/queries";
import { personName } from "@/lib/projects/types";
import { progressLabel } from "@/lib/projects/progress";
import { createClient } from "@/lib/supabase/server";
import { stageHref } from "@/lib/work/next-action";

export type ProjectFile = {
  callId: string;
  callTitle: string;
  occurredAt: string;
  mime: string | null;
  bytes: number | null;
  // Short-lived signed URL (attachment), null when storage refused it.
  downloadUrl: string | null;
  hasTranscript: boolean;
  hasReport: boolean;
};

// "…/call.m4a" → "m4a": the downloaded file keeps its extension.
const extensionOf = (path: string) => path.split(".").pop() ?? "";

/**
 * Files stored for the project today: the call recordings. Read with the
 * user's session, so storage RLS decides who may download.
 */
export async function listProjectFiles(
  projectId: string,
): Promise<ProjectFile[]> {
  const supabase = await createClient();
  const { data: calls, error } = await supabase
    .from("calls")
    .select("id, title, occurred_at, audio_path, audio_mime, audio_bytes")
    .eq("project_id", projectId)
    .not("audio_path", "is", null)
    .order("occurred_at", { ascending: false });
  if (error) console.error("listProjectFiles:", error.message);
  if (!calls?.length) return [];

  const ids = calls.map((c) => c.id);
  const [transcripts, reports, urls] = await Promise.all([
    supabase.from("transcripts").select("call_id").in("call_id", ids),
    supabase.from("call_reports").select("call_id").in("call_id", ids),
    Promise.all(
      calls.map((c) =>
        c.audio_path
          ? getAudioUrl(
              supabase,
              c.audio_path,
              `${c.title}.${extensionOf(c.audio_path)}`,
            )
          : null,
      ),
    ),
  ]);
  const transcribed = new Set((transcripts.data ?? []).map((t) => t.call_id));
  const reported = new Set((reports.data ?? []).map((r) => r.call_id));

  return calls.map((c, i) => ({
    callId: c.id,
    callTitle: c.title,
    occurredAt: c.occurred_at,
    mime: c.audio_mime,
    bytes: c.audio_bytes,
    downloadUrl: urls[i] ?? null,
    hasTranscript: transcribed.has(c.id),
    hasReport: reported.has(c.id),
  }));
}

export type ProjectValidation = {
  id: string;
  state: string;
  stageLabel: string;
  stageHref: string;
  requestedByName: string;
  validatorName: string;
  requestNote: string | null;
  decisionComment: string | null;
  requestedAt: string;
  decidedAt: string | null;
};

type RawPerson = { first_name: string | null; last_name: string | null } | null;
const nameOf = (p: RawPerson) =>
  p ? personName(p.first_name, p.last_name) : "";

/** Every validation request of the project's stages, newest first. */
export async function listProjectValidations(
  projectId: string,
): Promise<ProjectValidation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("validations")
    .select(
      "id, state, request_note, decision_comment, requested_at, decided_at, requester:people!validations_requested_by_fkey(first_name, last_name), validator:people!validations_validator_person_id_fkey(first_name, last_name), project_stages!inner(project_id, stage_definitions!inner(key, label))",
    )
    .eq("project_stages.project_id", projectId)
    .order("requested_at", { ascending: false });
  if (error) {
    console.error("listProjectValidations:", error.message);
    return [];
  }
  return (data ?? []).map((v) => ({
    id: v.id,
    state: v.state,
    // In the words of the workflows, not the stage's (UX test of 09/10/2026).
    stageLabel: progressLabel({
      key: v.project_stages.stage_definitions.key,
      state: "in_progress",
    }),
    stageHref: stageHref(projectId, v.project_stages.stage_definitions.key),
    requestedByName: nameOf(v.requester),
    validatorName: nameOf(v.validator),
    requestNote: v.request_note,
    decisionComment: v.decision_comment,
    requestedAt: v.requested_at,
    decidedAt: v.decided_at,
  }));
}
