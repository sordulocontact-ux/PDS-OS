"use server";

import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** A project a note can be pinned to. */
export type NoteProjectOption = { id: string; title: string };

/**
 * The projects the viewer sees (RLS), live ones by title: the choices of a
 * note's « Projet ». Read with the viewer's session; the RLS of `notes` has
 * the last word on saving.
 */
export async function loadNoteProjectOptions(): Promise<NoteProjectOption[]> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title")
    .is("archived_at", null)
    .order("title");
  if (error) throw new Error(`loadNoteProjectOptions: ${error.message}`);
  return data;
}
