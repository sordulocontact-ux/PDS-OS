"use server";

import { requireApproved } from "@/lib/auth/dal";
import { loadCallContacts } from "@/lib/calls/invite";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { listArtistOptions } from "@/lib/catalog/queries";
import { loadMembers } from "@/lib/framing/related";
import { demos } from "@/lib/i18n/fr/demos";
import { sessions } from "@/lib/i18n/fr/sessions";
import { createClient } from "@/lib/supabase/server";

/** What the session form chooses from: artists, titles, projects, people. */
export type SessionFormData = {
  artists: Record<string, string>;
  // The Catalogue's titles and maquettes (« Nuit blanche (Maquette) »).
  titles: Record<string, string>;
  projects: Record<string, string>;
  // Each project's artist: opened from a project, the session has it already.
  projectArtists: Record<string, string>;
  // The team (`m:`) and the Réseau (`c:`), as AttendeeChips lists them.
  people: PrepPerson[];
};

/** Read when « Nouvelle session » or « Modifier » opens. */
export async function loadSessionFormData(): Promise<SessionFormData> {
  const access = await requireApproved();
  const supabase = await createClient();
  const [artists, titles, projects, members, contacts] = await Promise.all([
    listArtistOptions(),
    supabase
      .from("masters")
      .select("id, title, demo_status")
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("projects")
      .select("id, title, artist_id")
      .is("archived_at", null)
      .order("title"),
    loadMembers(access),
    loadCallContacts(),
  ]);
  const failed = projects.error ?? titles.error;
  if (failed) console.error("loadSessionFormData:", failed.message);
  return {
    artists: Object.fromEntries(artists.map((a) => [a.id, a.name])),
    titles: Object.fromEntries(
      (titles.data ?? []).map((m) => [
        m.id,
        m.demo_status ? demos.inList(m.title) : m.title,
      ]),
    ),
    projects: Object.fromEntries(
      (projects.data ?? []).map((p) => [p.id, p.title]),
    ),
    projectArtists: Object.fromEntries(
      (projects.data ?? []).flatMap((p) =>
        p.artist_id ? [[p.id, p.artist_id]] : [],
      ),
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
