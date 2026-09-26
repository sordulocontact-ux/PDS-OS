"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ALLOWED_AUDIO_MIMES,
  MAX_AUDIO_BYTES,
  isConsent,
  type ActionResult,
} from "@/lib/calls/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Call mutations. Identity comes from the session, never from the client;
 * every write goes through the user's client so RLS stays the guard.
 */

async function approvedSession() {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId) return null;
  return { access, supabase: await createClient() };
}

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

export async function createCall(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const projectId = text(form, "projectId");
  const title = text(form, "title");
  const occurredAt = new Date(text(form, "occurredAt"));
  const consent = text(form, "consent");
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  if (Number.isNaN(occurredAt.getTime()))
    return { ok: false, error: "date_invalid" };
  if (!projectId || !isConsent(consent))
    return { ok: false, error: "invalid_input" };

  const { data, error } = await session.supabase
    .from("calls")
    .insert({
      organization_id: session.access.organizationId!,
      project_id: projectId,
      title,
      occurred_at: occurredAt.toISOString(),
      consent,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[calls] create failed:", error?.message);
    return { ok: false, error: "not_found" };
  }
  redirect(routes.projectCall(projectId, data.id));
}

export async function updateConsent(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const callId = text(form, "callId");
  const consent = text(form, "consent");
  const note = text(form, "note").slice(0, 500);
  if (!callId || !isConsent(consent))
    return { ok: false, error: "invalid_input" };

  const { data: call } = await session.supabase
    .from("calls")
    .select("audio_path")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return { ok: false, error: "not_found" };
  // The database refuses it too (calls_audio_requires_consent).
  if (call.audio_path && consent !== "granted")
    return { ok: false, error: "consent_locked" };

  const { error } = await session.supabase
    .from("calls")
    .update({ consent, consent_note: note || null })
    .eq("id", callId);
  if (error) {
    console.error("[calls] consent update failed:", error.message);
    return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}

/**
 * Records an audio file the browser has just uploaded to Storage. The path
 * must sit under the caller's organization and this call.
 */
export async function attachAudio(input: {
  callId: string;
  path: string;
  mime: string;
  bytes: number;
}): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const { callId, path, mime, bytes } = input;
  const prefix = `${session.access.organizationId}/${callId}/`;
  const file = path.slice(prefix.length);
  if (!path.startsWith(prefix) || !/^[\w-]+\.[a-z0-9]+$/.test(file))
    return { ok: false, error: "invalid_input" };
  if (!(ALLOWED_AUDIO_MIMES as readonly string[]).includes(mime))
    return { ok: false, error: "unsupported_type" };
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_AUDIO_BYTES)
    return { ok: false, error: "file_too_large" };

  const { data: call } = await session.supabase
    .from("calls")
    .select("consent, audio_path")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return { ok: false, error: "not_found" };
  if (call.consent !== "granted")
    return { ok: false, error: "consent_required" };
  if (call.audio_path) return { ok: false, error: "audio_exists" };

  const { data: updated, error } = await session.supabase
    .from("calls")
    .update({
      audio_path: path,
      audio_mime: mime,
      audio_bytes: bytes,
      status: "uploaded",
      error_code: null,
    })
    .eq("id", callId)
    .is("audio_path", null)
    .eq("consent", "granted")
    .select("id");
  if (error || !updated?.length) {
    console.error("[calls] attach audio failed:", error?.message);
    return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}
