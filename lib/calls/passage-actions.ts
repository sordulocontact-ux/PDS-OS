"use server";

import { requireApproved } from "@/lib/auth/dal";
import { passagesOf, type Passage } from "@/lib/calls/passages";
import { loadLatestTranscript } from "@/lib/calls/queries";
import { createClient } from "@/lib/supabase/server";

/** A call's transcript as lines, for the dialog that opens it on a quoted
 * passage (TranscriptPassageDialog), read under the user's session: whoever
 * does not see the call gets nothing. */
export async function loadCallPassages(callId: string): Promise<Passage[]> {
  await requireApproved();
  const supabase = await createClient();
  const stored = await loadLatestTranscript(supabase, callId);
  if (!stored) throw new Error("not_found");
  return passagesOf(stored.transcript);
}
