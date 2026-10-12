"use server";

import { z } from "zod";

import {
  catalogOrganization,
  refreshMaster,
} from "@/lib/catalog/master/action-helpers";
import {
  SESSION_KINDS,
  WORK_STATUSES,
  oneOf,
} from "@/lib/catalog/master/rules";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Sessions shared between titles and working files (retours Catalogue 27 à
// 38): every write with the user's session, RLS and the triggers of
// …20261012101601_sessions_work_files decide (manage_catalog, live title).

type Result = { ok: true } | { ok: false; error: string };

const id = z.uuid();
const e = fr.masterPage.sessions.errors;

function failure(error: { message?: string } | null): Result {
  const message = error?.message ?? "";
  for (const code of [
    "session_shared",
    "session_last_title",
    "session_not_of_title",
  ] as const)
    if (message.includes(code)) return { ok: false, error: e[code] };
  if (error) console.error("session-actions:", message);
  return { ok: false, error: e.failed };
}

export type AttachableSession = {
  id: string;
  label: string;
  titles: string[];
};

/**
 * The sessions of the Catalogue not linked to this title yet, most recent
 * first, with the titles they already serve (« Rattacher une session »).
 */
export async function listAttachableSessions(
  masterId: string,
): Promise<AttachableSession[]> {
  if (!id.safeParse(masterId).success || !(await catalogOrganization()))
    return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_sessions")
    .select(
      "id, kind, studio, session_date, master_session_titles(master_id, masters(title))",
    )
    .order("session_date", { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) console.error("listAttachableSessions:", error.message);
  return (data ?? [])
    .filter(
      (s) => !s.master_session_titles.some((l) => l.master_id === masterId),
    )
    .map((s) => ({
      id: s.id,
      label: sessionLabel({
        kind: oneOf(SESSION_KINDS, s.kind, "other"),
        studio: s.studio,
        date: s.session_date,
      }),
      titles: s.master_session_titles.flatMap((l) =>
        l.masters ? [l.masters.title] : [],
      ),
    }));
}

/** « Rattacher » an existing session to this title: a link, never a copy. */
export async function attachSession(
  masterId: string,
  sessionId: string,
): Promise<Result> {
  const organizationId = await catalogOrganization();
  if (!id.safeParse(masterId).success || !id.safeParse(sessionId).success)
    return { ok: false, error: e.failed };
  if (!organizationId) return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await supabase.from("master_session_titles").insert({
    session_id: sessionId,
    master_id: masterId,
    organization_id: organizationId,
  });
  if (error) return failure(error);
  refreshMaster(masterId);
  return { ok: true };
}

/** « Détacher de ce titre »: the session stays on its other titles. */
export async function detachSession(
  masterId: string,
  sessionId: string,
): Promise<Result> {
  if (!id.safeParse(masterId).success || !id.safeParse(sessionId).success)
    return { ok: false, error: e.failed };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_session_titles")
    .delete()
    .eq("session_id", sessionId)
    .eq("master_id", masterId)
    .select("session_id");
  if (error || !data?.length) return failure(error);
  refreshMaster(masterId);
  return { ok: true };
}

/** « Supprimer » a session that serves this title only (retour 35). */
export async function deleteSession(
  masterId: string,
  sessionId: string,
): Promise<Result> {
  if (!id.safeParse(masterId).success || !id.safeParse(sessionId).success)
    return { ok: false, error: e.failed };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("master_session_titles")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("master_id", masterId)
    .maybeSingle();
  if (!link) return { ok: false, error: e.session_not_of_title };
  const { data, error } = await supabase
    .from("master_sessions")
    .delete()
    .eq("id", sessionId)
    .select("id");
  if (error || !data?.length) return failure(error);
  refreshMaster(masterId);
  return { ok: true };
}

const workLink = z.object({
  masterId: id,
  linkId: id.nullable(),
  label: z.string().trim().min(1).max(200),
  url: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
  sessionId: id.nullable(),
  status: z.enum(WORK_STATUSES).nullable(),
});

/** A working file too large for the storage, kept as a link (retour 21). */
export async function saveWorkLink(
  input: z.input<typeof workLink>,
): Promise<Result> {
  const t = fr.masterPage.workFiles;
  const parsed = workLink.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.urlInvalid };
  const organizationId = await catalogOrganization();
  if (!organizationId) return { ok: false, error: fr.auth.errors.forbidden };
  const v = parsed.data;
  const row = {
    label: v.label,
    url: v.url,
    session_id: v.sessionId,
    work_status: v.status,
  };
  const supabase = await createClient();
  const { error } = v.linkId
    ? await supabase
        .from("master_work_links")
        .update(row)
        .eq("id", v.linkId)
        .eq("master_id", v.masterId)
    : await supabase.from("master_work_links").insert({
        ...row,
        organization_id: organizationId,
        master_id: v.masterId,
      });
  if (error) return failure(error);
  refreshMaster(v.masterId);
  return { ok: true };
}

const workFile = z.object({
  masterId: id,
  fileId: id,
  sessionId: id.nullable(),
  status: z.enum(WORK_STATUSES).nullable(),
});

/** A working file's session and state, on every version of it. */
export async function updateWorkFile(
  input: z.input<typeof workFile>,
): Promise<Result> {
  const parsed = workFile.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.failed };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("master_files")
    .select("series_id")
    .eq("id", v.fileId)
    .eq("master_id", v.masterId)
    .eq("category", "stems")
    .maybeSingle();
  if (!current) return { ok: false, error: e.failed };
  const { error } = await supabase
    .from("master_files")
    .update({ session_id: v.sessionId, work_status: v.status })
    .eq("series_id", current.series_id)
    .eq("master_id", v.masterId);
  if (error) return failure(error);
  refreshMaster(v.masterId);
  return { ok: true };
}

/** Removes a link to a working file (a stored file goes through the
 * library's own deletion, which also removes the object). */
export async function deleteWorkLink(
  masterId: string,
  linkId: string,
): Promise<Result> {
  if (!id.safeParse(masterId).success || !id.safeParse(linkId).success)
    return { ok: false, error: e.failed };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_work_links")
    .delete()
    .eq("id", linkId)
    .eq("master_id", masterId)
    .select("id");
  if (error || !data?.length) return failure(error);
  refreshMaster(masterId);
  return { ok: true };
}
