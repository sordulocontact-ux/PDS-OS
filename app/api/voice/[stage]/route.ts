import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { dictateFor } from "@/lib/voice/adapters";
import { isVoiceStage } from "@/lib/voice/constants";
import { readDictation, replyError } from "@/lib/voice/http";

// Transcription and extraction of a two-minute dictation: well under a minute.
export const maxDuration = 60;

/**
 * Dictation of a stage form: multipart `projectId` + `audio`. Answers the
 * heard text and the proposals; writes nothing. The audio is not kept.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/voice/[stage]">,
) {
  const body = await readDictation(request);
  if ("error" in body) return replyError(body.error);

  const { stage } = await params;
  if (!isVoiceStage(stage)) return replyError("not_found");
  const projectId = z.uuid().safeParse(body.form.get("projectId"));
  if (!projectId.success) return replyError("invalid_input");

  // Refused before transcription: only the project's owner writes its stages.
  const supabase = await createClient();
  const { data: isOwner } = await supabase.rpc("is_project_owner", {
    p_project_id: projectId.data,
  });
  if (!isOwner) return replyError("forbidden");

  const result = await dictateFor(stage, projectId.data, body.audio);
  return result.ok ? Response.json(result) : replyError(result.error);
}
