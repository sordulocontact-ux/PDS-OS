"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ALLOWED_AUDIO_MIMES,
  MAX_AUDIO_BYTES,
  type ActionResult,
} from "@/lib/calls/constants";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
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
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  if (Number.isNaN(occurredAt.getTime()))
    return { ok: false, error: "date_invalid" };
  if (!projectId) return { ok: false, error: "invalid_input" };

  const { data, error } = await session.supabase
    .from("calls")
    .insert({
      organization_id: session.access.organizationId!,
      project_id: projectId,
      title,
      occurred_at: occurredAt.toISOString(),
      // Recording consent is given by contract.
      consent: "granted",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[calls] create failed:", error?.message);
    return { ok: false, error: "not_found" };
  }
  redirect(routes.projectCall(projectId, data.id));
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

const agendaSchema = z
  .array(
    z.object({
      topic: z.string().trim().min(1).max(200),
      minutes: z.number().int().min(1).max(240),
    }),
  )
  .max(20);

/**
 * Saves an edited agenda (add, rename, retime, remove, reorder a point): the
 * total is always the sum of its points, never a value typed by hand
 * (CLAUDE.md rule 6). Editable only before the call is recorded — once audio
 * is attached, the agenda is history, not a plan.
 */
export async function updateCallAgenda(
  callId: string,
  agenda: AgendaItem[],
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = agendaSchema.safeParse(agenda);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const durationMinutes = parsed.data.reduce(
    (sum, item) => sum + item.minutes,
    0,
  );

  const { data: updated, error } = await session.supabase
    .from("calls")
    .update({
      agenda: parsed.data,
      duration_minutes: durationMinutes || null,
    })
    .eq("id", callId)
    .is("audio_path", null)
    .select("id");
  if (error || !updated?.length) {
    console.error("[calls] update agenda failed:", error?.message);
    return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}
