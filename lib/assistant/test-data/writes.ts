import "server-only";

import {
  fakeArtist,
  fakeMasters,
  fakeProject,
  withSuffix,
} from "@/lib/assistant/test-data/fake";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { listAssignablePeople } from "@/lib/projects/queries";
import type { MusicFormat } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Writes of the test data (docs/ASSISTANT.md § 3 ter), shared by
 * create_test_data and fill_page_test_data. User's session: the same insert
 * and RPCs as the forms, so RLS and every SQL check apply.
 */

export type Supabase = Awaited<ReturnType<typeof createClient>>;
export type Named = { id: string; name: string };
export type Person = { personId: string; name: string };

const UNIQUE_VIOLATION = "23505";

/** True when a write succeeded; logs the error otherwise. */
export function logged(
  { error }: { error: { message: string } | null },
  what: string,
): boolean {
  if (error) console.error(`testData ${what}:`, error.message);
  return !error;
}

export async function insertArtist(
  supabase: Supabase,
  organizationId: string,
): Promise<Named | null> {
  const { name, relation } = fakeArtist();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("artists")
      .insert({
        organization_id: organizationId,
        name: withSuffix(name, attempt),
        relation,
        notes: fr.assistant.testData.notes,
      })
      .select("id, name")
      .single();
    if (data) return data;
    if (error?.code !== UNIQUE_VIOLATION) {
      console.error("testData artist:", error?.message);
      return null;
    }
  }
  return null;
}

export async function insertMasters(
  supabase: Supabase,
  organizationId: string,
  artist: Named,
  count: number,
): Promise<Named[] | null> {
  const created: Named[] = [];
  for (const master of fakeMasters(count)) {
    const { data: id, error } = await supabase.rpc("create_master", {
      p_organization_id: organizationId,
      p_title: master.title,
      p_credits: [{ artist_id: artist.id, role: "main" }],
      p_variant: "original",
      p_audio_state: master.audioState,
      p_duration_seconds: master.durationSeconds,
    });
    if (error || !id) {
      console.error("testData master:", error?.message);
      return null;
    }
    created.push({ id, name: master.title });
  }
  return created;
}

/** The required manager: the user if assignable, else the first one. */
export async function pickManager(access: Access): Promise<Person | null> {
  if (!access.organizationId) return null;
  const people = await listAssignablePeople(access.organizationId);
  return (
    people.find((p) => p.personId === access.personId) ?? people[0] ?? null
  );
}

/** A project transmitted to `manager`, as `create_project` does from the form. */
export async function insertProject(
  supabase: Supabase,
  input: {
    organizationId: string;
    type: "music_release" | "content";
    format: MusicFormat;
    masters: Named[];
    manager: Person;
  },
): Promise<{ id: string; title: string; kind: string } | null> {
  const { type, format, masters } = input;
  const fake = fakeProject(type);
  const music = type === "music_release";
  const title = music && format === "single" ? masters[0].name : fake.title;
  const { data: id, error } = await supabase.rpc("create_project", {
    p_organization_id: input.organizationId,
    p_title: title,
    p_type: type,
    p_master_ids: masters.map((m) => m.id),
    p_music_format: music ? format : undefined,
    p_due_date: fake.dueDate,
    p_budget_cents: fake.budgetCents,
    p_priority: fake.priority,
    p_initial_context: fr.assistant.testData.notes,
    p_assignee_person_id: input.manager.personId,
    p_creative_person_ids: [],
  });
  if (error || !id) {
    console.error("testData project:", error?.message);
    return null;
  }
  const kind = projectKindLabel({
    type,
    musicFormat: music ? format : null,
    contentFormatName: null,
  });
  return { id, title, kind };
}
