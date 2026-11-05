"use server";

import { requireApproved } from "@/lib/auth/dal";
import { loadCallContacts } from "@/lib/calls/invite";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { listArtistOptions } from "@/lib/catalog/queries";
import { loadMembers } from "@/lib/framing/related";
import { sessions } from "@/lib/i18n/fr/sessions";
import { createClient } from "@/lib/supabase/server";

/** What the session form chooses from: artists, projects, people. */
export type SessionFormData = {
  artists: Record<string, string>;
  projects: Record<string, string>;
  // The team (`m:`) and the Réseau (`c:`), as AttendeeChips lists them.
  people: PrepPerson[];
};

/** Read when « Nouvelle session » or « Modifier » opens. */
export async function loadSessionFormData(): Promise<SessionFormData> {
  const access = await requireApproved();
  const supabase = await createClient();
  const [artists, projects, members, contacts] = await Promise.all([
    listArtistOptions(),
    supabase
      .from("projects")
      .select("id, title")
      .is("archived_at", null)
      .order("title"),
    loadMembers(access),
    loadCallContacts(),
  ]);
  if (projects.error)
    console.error("loadSessionFormData:", projects.error.message);
  return {
    artists: Object.fromEntries(artists.map((a) => [a.id, a.name])),
    projects: Object.fromEntries(
      (projects.data ?? []).map((p) => [p.id, p.title]),
    ),
    people: [
      ...members.map((m) => ({
        key: `m:${m.personId}`,
        name: m.name,
        detail: sessions.form.teamDetail,
        external: false,
        invite: "app" as const,
        email: null,
      })),
      ...contacts.map((c) => ({
        key: `c:${c.contactId}`,
        name: c.name,
        detail: c.roles,
        external: true,
        invite: null,
        email: c.email?.toLowerCase() ?? null,
      })),
    ],
  };
}
