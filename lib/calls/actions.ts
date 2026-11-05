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
import { setCallAudio } from "@/lib/calls/attach";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { meetingUrlSchema, planCall } from "@/lib/calls/plan-call";
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

// The call's page, telling when Google gave no Meet link.
const withMeetNotice = (href: string, meetFailed: boolean) =>
  meetFailed ? `${href}?meet=failed` : href;

export async function createCall(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const projectId = text(form, "projectId");
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: "invalid_input" };
  const result = await planCall(session, form, projectId);
  if (!result.ok) return result;
  redirect(
    withMeetNotice(routes.projectCall(projectId, result.id), result.meetFailed),
  );
}

/**
 * An internal meeting: a call without a project, seen by its creator and the
 * members invited to it (can_see_call). Any member creates one; recorded and
 * processed like a call, without a Brief to fill.
 */
export async function createMeeting(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const result = await planCall(session, form, null);
  if (!result.ok) return result;
  // `stay`: created from PO's panel, which shows the link itself.
  if (form.get("stay") === "1") return { ok: true, id: result.id };
  redirect(withMeetNotice(routes.call(result.id), result.meetFailed));
}

/** The video link of a call, added or changed before or after the fact. */
export async function updateCallLink(
  callId: string,
  meetingUrl: string,
): Promise<ActionResult> {
  const session = await approvedSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = meetingUrlSchema.safeParse(meetingUrl);
  if (!parsed.success || !z.uuid().safeParse(callId).success)
    return { ok: false, error: "link_invalid" };
  const { data: updated, error } = await session.supabase
    .from("calls")
    .update({ meeting_url: parsed.data })
    .eq("id", callId)
    .select("id");
  if (error || !updated?.length) {
    if (error) console.error("[calls] update link failed:", error.message);
    return { ok: false, error: "forbidden" };
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

  const attached = await setCallAudio(session.supabase, callId, {
    path,
    mime,
    bytes,
  });
  if (!attached.ok) return attached;
  refresh();
  return { ok: true };
}

const agendaSchema = z
  .array(
    z.object({
      topic: z.string().trim().min(1).max(200),
      minutes: z.number().int().min(1).max(240),
      questions: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
      dimension: z.string().max(20).optional(),
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
