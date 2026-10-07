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
import { schedulePendingPushes } from "@/lib/notifications/push";
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

// A video link (Meet, Zoom, Teams…): https only, as the database checks.
// Blank means none.
const meetingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null)
  .refine((value) => value === null || /^https:\/\/\S+$/.test(value));

function meetingUrlOf(form: FormData): string | null | undefined {
  const parsed = meetingUrlSchema.safeParse(text(form, "meetingUrl"));
  return parsed.success ? parsed.data : undefined;
}

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
  const meetingUrl = meetingUrlOf(form);
  if (meetingUrl === undefined) return { ok: false, error: "link_invalid" };

  const { data, error } = await session.supabase
    .from("calls")
    .insert({
      organization_id: session.access.organizationId!,
      project_id: projectId,
      title,
      occurred_at: occurredAt.toISOString(),
      meeting_url: meetingUrl,
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

const attendeesSchema = z.array(z.uuid()).max(50);

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

  const title = text(form, "title");
  const occurredAt = new Date(text(form, "occurredAt"));
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  if (Number.isNaN(occurredAt.getTime()))
    return { ok: false, error: "date_invalid" };
  const meetingUrl = meetingUrlOf(form);
  if (meetingUrl === undefined) return { ok: false, error: "link_invalid" };
  let attendees: string[];
  try {
    const parsed = attendeesSchema.safeParse(
      JSON.parse(text(form, "attendees") || "[]"),
    );
    if (!parsed.success) return { ok: false, error: "invalid_input" };
    attendees = [...new Set(parsed.data)].filter(
      (id) => id !== session.access.personId,
    );
  } catch {
    return { ok: false, error: "invalid_input" };
  }

  const organizationId = session.access.organizationId!;
  const { data, error } = await session.supabase
    .from("calls")
    .insert({
      organization_id: organizationId,
      title,
      occurred_at: occurredAt.toISOString(),
      meeting_url: meetingUrl,
      consent: "granted",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[calls] create meeting failed:", error?.message);
    return { ok: false, error: "save_failed" };
  }
  if (attendees.length > 0) {
    // Each invitation notifies its member (database trigger).
    const { error: inviteError } = await session.supabase
      .from("call_attendees")
      .insert(
        attendees.map((personId) => ({
          call_id: data.id,
          organization_id: organizationId,
          person_id: personId,
        })),
      );
    if (inviteError)
      console.error("[calls] invite failed:", inviteError.message);
    else await schedulePendingPushes();
  }
  // `stay`: created from PO's panel, which shows the link itself.
  if (form.get("stay") === "1") return { ok: true, id: data.id };
  redirect(routes.meeting(data.id));
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
      questions: z.array(z.string().max(300)).max(20).optional(),
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
