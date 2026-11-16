"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import type { MasterFormState } from "@/lib/catalog/master/rules";
import { sessions } from "@/lib/i18n/fr/sessions";
import {
  cancelSessionEvent,
  syncSessionCalendar,
} from "@/lib/sessions/calendar";
import {
  sessionLinkSchema,
  sessionReportSchema,
  studioSessionSchema,
} from "@/lib/sessions/schemas";
import {
  failedState,
  parseSessionForm,
  refreshSessions,
  sessionsOrganization,
  syncAttendees,
  syncLinks,
} from "@/lib/sessions/write";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { sessions };

// Sessions studio (retours d'Ibé du 01/11/2026): created and edited on their
// own page, from the menu, an artist or a project. RLS decides
// (manage_sessions); docs/ARCHITECTURE.md § 2 sexies bis.

/** « Nouvelle session » or « Modifier »: the session and what it is tied to. */
export async function saveStudioSession(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseSessionForm(studioSessionSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { organizationId, data } = parsed;
  // Never its state: computed (lib/sessions/state.ts); « Annuler la séance »
  // alone stores one.
  const row = {
    kind: data.kind,
    session_date: data.date,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    studio: data.studio,
    engineer: data.engineer,
    engineer_contact_id: data.engineerRef,
    notes: data.notes,
  };
  const supabase = await createClient();
  let sessionId = data.sessionId;
  if (sessionId) {
    const { error } = await supabase
      .from("master_sessions")
      .update(row)
      .eq("id", sessionId);
    if (error) return failedState("saveStudioSession", formData, error);
  } else {
    const { data: created, error } = await supabase
      .from("master_sessions")
      .insert({ ...row, status: "planned", organization_id: organizationId })
      .select("id")
      .single();
    if (error) return failedState("saveStudioSession", formData, error);
    sessionId = created.id;
    // A title of a collective not in the Catalogue yet gets its title there,
    // provisional, at its first session (lot 7).
    const masterIds: string[] = [];
    for (const id of data.titleIds) {
      if (!id.startsWith("pt:")) {
        masterIds.push(id);
        continue;
      }
      const { data: masterId, error: titleError } = await supabase.rpc(
        "ensure_project_title_master",
        { p_title_id: id.slice(3) },
      );
      if (titleError || !masterId)
        return failedState(
          "saveStudioSession",
          formData,
          titleError ?? { message: "ensure_project_title_master" },
        );
      masterIds.push(masterId);
    }
    if (masterIds.length) {
      const { error: titlesError } = await supabase
        .from("master_session_titles")
        .insert(
          [...new Set(masterIds)].map((masterId) => ({
            session_id: sessionId!,
            master_id: masterId,
            organization_id: organizationId,
          })),
        );
      if (titlesError)
        return failedState("saveStudioSession", formData, titlesError);
    }
  }
  const linkError =
    (await syncLinks(
      supabase,
      "master_session_artists",
      sessionId,
      organizationId,
      data.artistIds,
    )) ??
    (await syncLinks(
      supabase,
      "master_session_projects",
      sessionId,
      organizationId,
      data.projectIds,
    )) ??
    (await syncAttendees(
      supabase,
      sessionId,
      organizationId,
      data.attendees,
      data.guests,
    ));
  if (linkError) return failedState("saveStudioSession", formData, linkError);
  // The label's Google Agenda, the internal team invited (never blocking).
  await syncSessionCalendar(sessionId);
  refreshSessions(sessionId);
  // A new session opens on its own page.
  if (!data.sessionId) redirect(routes.session(sessionId));
  return { status: "saved" };
}

/** « Rédiger le compte rendu »: what happened, what to remember, what comes
 * next, and who was there. Written, the session is Terminée. */
export async function saveSessionReport(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseSessionForm(sessionReportSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { organizationId, data } = parsed;
  const supabase = await createClient();
  // Reported: the session took place (a planned one is marked held).
  const { error } = await supabase
    .from("master_sessions")
    .update({
      report_notes: data.reportNotes,
      report_takeaways: data.reportTakeaways,
      report_next_step: data.reportNextStep,
      status: "done",
    })
    .eq("id", data.sessionId)
    .neq("status", "cancelled");
  if (error) return failedState("saveSessionReport", formData, error);
  const attendeesError = await syncAttendees(
    supabase,
    data.sessionId,
    organizationId,
    data.attendees,
    data.guests,
  );
  if (attendeesError)
    return failedState("saveSessionReport", formData, attendeesError);
  refreshSessions(data.sessionId);
  return { status: "saved" };
}

/** « Ajouter un lien »: where the rushes are kept, never a copy. */
export async function addSessionLink(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseSessionForm(sessionLinkSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { organizationId, data } = parsed;
  const supabase = await createClient();
  const { error } = await supabase.from("master_session_links").insert({
    session_id: data.sessionId,
    organization_id: organizationId,
    label: data.label,
    url: data.url,
  });
  if (error) return failedState("addSessionLink", formData, error);
  refreshSessions(data.sessionId);
  return { status: "saved" };
}

const id = z.uuid();

async function guard(...ids: string[]): Promise<WriteResult | null> {
  if (!ids.every((value) => id.safeParse(value).success))
    return { ok: false, error: fr.sessions.errors.failed };
  if (!(await sessionsOrganization()))
    return { ok: false, error: fr.sessions.errors.forbidden };
  return null;
}

function failure(
  scope: string,
  error: { message: string } | null,
): WriteResult {
  if (error) console.error(`${scope}:`, error.message);
  return {
    ok: false,
    error: error?.message.includes("session_shared")
      ? fr.sessions.errors.session_shared
      : fr.sessions.errors.failed,
  };
}

/** « Retirer le lien »: the file stays where it is. */
export async function deleteSessionLink(
  sessionId: string,
  linkId: string,
): Promise<WriteResult> {
  const refused = await guard(sessionId, linkId);
  if (refused) return refused;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_session_links")
    .delete()
    .eq("id", linkId)
    .eq("session_id", sessionId)
    .select("id");
  if (error || !data?.length) return failure("deleteSessionLink", error);
  refreshSessions(sessionId);
  return { ok: true };
}

/** « Détacher de la session »: the title stays in the Catalogue. */
export async function detachSessionTitle(
  sessionId: string,
  masterId: string,
): Promise<WriteResult> {
  const refused = await guard(sessionId, masterId);
  if (refused) return refused;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_session_titles")
    .delete()
    .eq("session_id", sessionId)
    .eq("master_id", masterId)
    .select("session_id");
  if (error || !data?.length) return failure("detachSessionTitle", error);
  refreshSessions(sessionId);
  return { ok: true };
}

/** « Annuler la séance » / « Rétablir la séance »: the only state stored. */
export async function setSessionCancelled(
  sessionId: string,
  cancelled: boolean,
): Promise<WriteResult> {
  const refused = await guard(sessionId);
  if (refused) return refused;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_sessions")
    .update({ status: cancelled ? "cancelled" : "planned" })
    .eq("id", sessionId)
    .select("id");
  if (error || !data?.length) return failure("setSessionCancelled", error);
  await syncSessionCalendar(sessionId);
  refreshSessions(sessionId);
  return { ok: true };
}

/** « Supprimer la session »: its titles and maquettes stay. */
export async function deleteStudioSession(
  sessionId: string,
): Promise<WriteResult> {
  const refused = await guard(sessionId);
  if (refused) return refused;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_sessions")
    .delete()
    .eq("id", sessionId)
    .select("id, google_event_id");
  if (error || !data?.length) return failure("deleteStudioSession", error);
  await cancelSessionEvent(data[0]?.google_event_id ?? null);
  refreshSessions();
  return { ok: true };
}
