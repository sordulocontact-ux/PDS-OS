"use server";

import type { MasterFormState } from "@/lib/catalog/master/rules";
import { demos } from "@/lib/i18n/fr/demos";
import { sessionAttachSchema, sessionDemoSchema } from "@/lib/sessions/schemas";
import {
  failedState,
  parseSessionForm,
  refreshSessions,
  sessionsOrganization,
} from "@/lib/sessions/write";
import { createClient } from "@/lib/supabase/server";

const fr = { demos };

/**
 * « Nouvelle maquette » from a session's report: a title of the Catalogue's
 * Maquettes (draft), credited to its artist and linked to the session. It
 * becomes a master later, on the same row (promote_demo).
 */
export async function createSessionDemo(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseSessionForm(sessionDemoSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { organizationId, data } = parsed;
  const supabase = await createClient();
  const { data: masterId, error } = await supabase.rpc("create_master", {
    p_organization_id: organizationId,
    p_title: data.title,
    p_credits: [{ artist_id: data.artistId, role: "main" }],
    p_audio_state: "demo",
    p_demo_status: "draft",
  });
  if (error || !masterId)
    return failedState(
      "createSessionDemo",
      formData,
      error ?? { message: "no id" },
    );
  const { error: linkError } = await supabase
    .from("master_session_titles")
    .insert({
      session_id: data.sessionId,
      master_id: masterId,
      organization_id: organizationId,
    });
  if (linkError) return failedState("createSessionDemo", formData, linkError);
  refreshSessions(data.sessionId);
  return { status: "saved" };
}

/** The titles and maquettes a session may be tied to (not yet tied). */
export async function loadAttachableTitles(
  sessionId: string,
): Promise<Record<string, string>> {
  if (!(await sessionsOrganization())) return {};
  const supabase = await createClient();
  const [titles, linked] = await Promise.all([
    supabase
      .from("masters")
      .select("id, title, demo_status")
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("master_session_titles")
      .select("master_id")
      .eq("session_id", sessionId),
  ]);
  if (titles.error)
    console.error("loadAttachableTitles:", titles.error.message);
  const taken = new Set((linked.data ?? []).map((l) => l.master_id));
  return Object.fromEntries(
    (titles.data ?? [])
      .filter((m) => !taken.has(m.id))
      .map((m) => [
        m.id,
        m.demo_status ? `${m.title} (${fr.demos.tab})` : m.title,
      ]),
  );
}

/** « Rattacher un titre », from its form. */
export async function attachSessionTitleForm(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseSessionForm(sessionAttachSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { organizationId, data } = parsed;
  const supabase = await createClient();
  const { error } = await supabase.from("master_session_titles").insert({
    session_id: data.sessionId,
    master_id: data.masterId,
    organization_id: organizationId,
  });
  if (error) return failedState("attachSessionTitleForm", formData, error);
  refreshSessions(data.sessionId);
  return { status: "saved" };
}
