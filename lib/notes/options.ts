"use server";

import { requireApproved } from "@/lib/auth/dal";
import { notes } from "@/lib/i18n/fr/notes";
import { dealNameOf } from "@/lib/notes/read";
import type { NoteLinkKind, NotePerson } from "@/lib/notes/views";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** A record a note can be linked to: its name in the menu, its pill's text. */
export type NoteLinkOption = { id: string; name: string; label: string };

/** What a note's « Lier à » offers, by kind, and who writes (the viewer). */
export type NoteLinkChoices = Record<NoteLinkKind, NoteLinkOption[]> & {
  me: NotePerson;
};

/**
 * The projects (live ones), deals and contracts the viewer reads, in one
 * call: each read with the viewer's session, so the RLS keeps out what he
 * may not link (the RLS of `notes` has the last word on saving).
 */
export async function loadNoteLinkOptions(): Promise<NoteLinkChoices> {
  const access = await requireApproved();
  const supabase = await createClient();
  const [projects, deals, contracts] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title")
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("deals")
      .select(
        "id, artist:artists!deals_artist_same_org(name), project:projects!deals_project_same_org(title)",
      )
      .order("updated_at", { ascending: false }),
    supabase.from("contracts").select("id, title").order("title"),
  ]);
  for (const { error } of [projects, deals, contracts])
    if (error) throw new Error(`loadNoteLinkOptions: ${error.message}`);
  return {
    project: (projects.data ?? []).map((p) => ({
      id: p.id,
      name: p.title,
      label: p.title,
    })),
    deal: (deals.data ?? []).map((d) => {
      const name = dealNameOf(d);
      return {
        id: d.id,
        name: name ?? notes.link.kinds.deal,
        label: notes.link.deal(name),
      };
    }),
    contract: (contracts.data ?? []).map((c) => ({
      id: c.id,
      name: c.title,
      label: c.title,
    })),
    me: {
      personId: access.personId ?? "",
      name: personName(access.firstName, access.lastName),
    },
  };
}
