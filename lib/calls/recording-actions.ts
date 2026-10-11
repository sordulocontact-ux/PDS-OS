"use server";

import { refresh } from "next/cache";

import { getAccess } from "@/lib/auth/dal";
import { setCallAudio } from "@/lib/calls/attach";
import {
  AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  type ActionResult,
  type CallErrorCode,
} from "@/lib/calls/constants";
import { contiguousPieces } from "@/lib/calls/recording";
import { createClient } from "@/lib/supabase/server";

/**
 * A call recorded in the app, saved while it happens (PROJ-BUG-01): a take is
 * opened when recording starts, its pieces are written by the browser under
 * RLS, « Envoyer » assembles them. Everything runs with the user's session.
 */

const FORMATS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
};
// Pieces downloaded at once when assembling.
const PARALLEL = 6;

async function session() {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId) return null;
  return {
    organizationId: access.organizationId,
    supabase: await createClient(),
  };
}

export type BegunTake = { id: string; take: number; startedAt: string };

/** Opens the next take of a call, before anything is recorded. */
export async function beginRecordingTake(input: {
  callId: string;
  mime: string;
}): Promise<
  { ok: true; take: BegunTake } | { ok: false; error: CallErrorCode }
> {
  const s = await session();
  if (!s) return { ok: false, error: "unauthorized" };
  const ext = FORMATS[input.mime];
  if (!ext) return { ok: false, error: "unsupported_type" };

  const { data, error } = await s.supabase.rpc("begin_recording_take", {
    p_call_id: input.callId,
    p_mime: input.mime,
    p_ext: ext,
  });
  const take = data?.[0];
  if (error || !take) {
    console.error("[calls] begin take failed:", error?.message);
    return {
      ok: false,
      error: error?.code === "P0002" ? "audio_exists" : "save_failed",
    };
  }
  return {
    ok: true,
    take: { id: take.id, take: take.take, startedAt: take.started_at },
  };
}

async function download(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<Uint8Array[] | null> {
  const out: Uint8Array[] = [];
  for (let i = 0; i < paths.length; i += PARALLEL) {
    const batch = await Promise.all(
      paths.slice(i, i + PARALLEL).map(async (path) => {
        const { data } = await supabase.storage
          .from(AUDIO_BUCKET)
          .download(path);
        return data ? new Uint8Array(await data.arrayBuffer()) : null;
      }),
    );
    if (batch.some((b) => b === null)) return null;
    out.push(...(batch as Uint8Array[]));
  }
  return out;
}

/**
 * « Envoyer » : each saved take becomes one file (its pieces in order are the
 * recorder's output), the call gets its audio and processing can start.
 * Safe to run again after a failure: an assembled take is not redone.
 */
export async function sendRecording(callId: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, error: "unauthorized" };
  const { supabase, organizationId } = s;

  const { data: takes, error } = await supabase
    .from("call_recording_takes")
    .select(
      "id, take, mime, ext, path, bytes, call_recording_pieces(seq, path)",
    )
    .eq("call_id", callId)
    .is("discarded_at", null)
    .order("take");
  if (error) return { ok: false, error: "save_failed" };

  for (const take of takes) {
    if (take.path) continue;
    const pieces = contiguousPieces(take.call_recording_pieces);
    if (pieces.length === 0) continue;
    const parts = await download(
      supabase,
      pieces.map((p) => p.path),
    );
    if (!parts) return { ok: false, error: "audio_unavailable" };
    const bytes = parts.reduce((sum, p) => sum + p.byteLength, 0);
    if (bytes > MAX_AUDIO_BYTES) return { ok: false, error: "file_too_large" };
    const body = new Uint8Array(bytes);
    parts.reduce(
      (offset, p) => (body.set(p, offset), offset + p.byteLength),
      0,
    );

    const path = `${organizationId}/${callId}/${crypto.randomUUID()}.${take.ext}`;
    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, body, { contentType: take.mime, upsert: false });
    if (uploadError) {
      console.error("[calls] take upload failed:", uploadError.message);
      return { ok: false, error: "save_failed" };
    }
    const { error: takeError } = await supabase
      .from("call_recording_takes")
      .update({ path, bytes })
      .eq("id", take.id)
      .is("path", null);
    if (takeError) return { ok: false, error: "save_failed" };
    take.path = path;
    take.bytes = bytes;
  }

  const sent = takes.filter((t) => t.path !== null);
  const first = sent[0];
  if (!first?.path) return { ok: false, error: "audio_missing" };
  const attached = await setCallAudio(supabase, callId, {
    path: first.path,
    mime: first.mime,
    bytes: sent.reduce((sum, t) => sum + (t.bytes ?? 0), 0),
  });
  if (!attached.ok) return attached;
  refresh();
  return { ok: true };
}

/**
 * « Supprimer » : the unsent takes are set aside, never erased (their files
 * stay in Storage). The call is back to « nothing recorded ».
 */
export async function discardRecording(callId: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return { ok: false, error: "unauthorized" };
  const { error } = await s.supabase
    .from("call_recording_takes")
    .update({ discarded_at: new Date().toISOString() })
    .eq("call_id", callId)
    .is("discarded_at", null);
  if (error) {
    console.error("[calls] discard recording failed:", error.message);
    return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}
