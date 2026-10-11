import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { toSavedTake, type SavedTake } from "@/lib/calls/recording";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type CallRecordingState = {
  // Saved but not sent yet (the call has no audio): what a reload finds.
  takes: SavedTake[];
  // Sent as several takes: their files in order, the first is calls.audio_path.
  parts: string[];
};

export async function loadCallRecording(
  supabase: Client,
  callId: string,
  audioPath: string | null,
): Promise<CallRecordingState> {
  const { data, error } = await supabase
    .from("call_recording_takes")
    .select(
      "id, take, started_at, path, call_recording_pieces(seq, end_ms, saved_at)",
    )
    .eq("call_id", callId)
    .is("discarded_at", null)
    .order("take");
  if (error) {
    // Unreadable is not « nothing saved »: say it rather than hide it.
    console.error("[calls] recording read failed:", error.message);
    throw new Error("call recording unreadable");
  }

  if (audioPath) {
    const parts = data.flatMap((t) => (t.path ? [t.path] : []));
    return { takes: [], parts: parts[0] === audioPath ? parts : [] };
  }
  return {
    takes: data
      .filter((t) => t.path === null)
      .map((t) =>
        toSavedTake({
          id: t.id,
          take: t.take,
          startedAt: t.started_at,
          pieces: t.call_recording_pieces.map((p) => ({
            seq: p.seq,
            endMs: p.end_ms,
            savedAt: p.saved_at,
          })),
        }),
      ),
    parts: [],
  };
}

/** Assembled takes of a call, in order, when its audio was recorded in parts. */
export async function audioParts(
  supabase: Client,
  callId: string,
  audioPath: string,
): Promise<string[]> {
  return (await loadCallRecording(supabase, callId, audioPath)).parts;
}
