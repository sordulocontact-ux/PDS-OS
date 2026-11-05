import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import type { MasterFormState } from "@/lib/catalog/master/rules";
import { sessions } from "@/lib/i18n/fr/sessions";
import { createClient } from "@/lib/supabase/server";

const fr = { sessions };

type Client = Awaited<ReturnType<typeof createClient>>;

// Shared by the session actions: every write runs with the user's session
// (RLS: manage_sessions); the permission check here only gives a clean
// message.

/** The organization of a viewer who runs sessions, else null. */
export async function sessionsOrganization(): Promise<string | null> {
  const access = await requireApproved();
  return access.organizationId && can(access, "manage_sessions")
    ? access.organizationId
    : null;
}

export async function parseSessionForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): Promise<
  | { ok: true; organizationId: string; data: z.output<T> }
  | { ok: false; state: MasterFormState }
> {
  const organizationId = await sessionsOrganization();
  if (!organizationId)
    return {
      ok: false,
      state: { status: "error", formError: fr.sessions.errors.forbidden },
    };
  const parsed = parseForm(schema, formData);
  if (!parsed.ok)
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: parsed.fieldErrors,
        formError: parsed.formError,
        values: parsed.values,
      },
    };
  return { ok: true, organizationId, data: parsed.data };
}

export function failedState(
  scope: string,
  formData: FormData,
  error: { message: string },
): MasterFormState {
  console.error(`${scope}:`, error.message);
  return {
    status: "error",
    formError: error.message.includes("session_shared")
      ? fr.sessions.errors.session_shared
      : databaseErrorMessage(error) || fr.sessions.errors.failed,
    values: retainedValues(formData),
  };
}

/** Every page that shows sessions reads them again. */
export function refreshSessions(sessionId?: string) {
  revalidatePath(routes.sessions, "layout");
  if (sessionId) revalidatePath(routes.session(sessionId));
  revalidatePath(routes.artists, "layout");
  revalidatePath(routes.masters, "layout");
}

type LinkTable = "master_session_artists" | "master_session_projects";

/** Makes a session's links to artists or projects exactly `wanted`. */
export async function syncLinks(
  supabase: Client,
  table: LinkTable,
  sessionId: string,
  organizationId: string,
  wanted: string[],
): Promise<{ message: string } | null> {
  const column =
    table === "master_session_artists" ? "artist_id" : "project_id";
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq("session_id", sessionId);
  if (error) return error;
  const current = (data ?? []).map(
    (row) => (row as unknown as Record<string, string>)[column],
  );
  const removed = current.filter((id) => !wanted.includes(id));
  const added = wanted.filter((id) => !current.includes(id));
  if (removed.length) {
    const { error: del } = await supabase
      .from(table)
      .delete()
      .eq("session_id", sessionId)
      .in(column, removed);
    if (del) return del;
  }
  if (added.length) {
    const rows = added.map((id) => ({
      session_id: sessionId,
      organization_id: organizationId,
      [column]: id,
    }));
    const { error: ins } =
      table === "master_session_artists"
        ? await supabase.from(table).insert(
            rows as {
              session_id: string;
              organization_id: string;
              artist_id: string;
            }[],
          )
        : await supabase.from(table).insert(
            rows as {
              session_id: string;
              organization_id: string;
              project_id: string;
            }[],
          );
    if (ins) return ins;
  }
  return null;
}

/** Makes a session's participants exactly these members and contacts. */
export async function syncAttendees(
  supabase: Client,
  sessionId: string,
  organizationId: string,
  personIds: string[],
  contactIds: string[],
): Promise<{ message: string } | null> {
  const { data, error } = await supabase
    .from("master_session_attendees")
    .select("id, person_id, contact_id")
    .eq("session_id", sessionId);
  if (error) return error;
  const rows = data ?? [];
  const stale = rows.filter((r) =>
    r.person_id
      ? !personIds.includes(r.person_id)
      : !contactIds.includes(r.contact_id ?? ""),
  );
  if (stale.length) {
    const { error: del } = await supabase
      .from("master_session_attendees")
      .delete()
      .in(
        "id",
        stale.map((r) => r.id),
      );
    if (del) return del;
  }
  const fresh = [
    ...personIds
      .filter((id) => !rows.some((r) => r.person_id === id))
      .map((id) => ({ person_id: id, contact_id: null })),
    ...contactIds
      .filter((id) => !rows.some((r) => r.contact_id === id))
      .map((id) => ({ person_id: null, contact_id: id })),
  ];
  if (fresh.length) {
    const { error: ins } = await supabase
      .from("master_session_attendees")
      .insert(
        fresh.map((row) => ({
          ...row,
          session_id: sessionId,
          organization_id: organizationId,
        })),
      );
    if (ins) return ins;
  }
  return null;
}
