"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { authorOf, noteLinkOf, WRITTEN_NOTE_SELECT } from "@/lib/notes/read";
import type { NoteSheetData } from "@/lib/notes/views";
import { createClient } from "@/lib/supabase/server";

// A written note's side sheet (NoteSheet), read when it opens, with the
// viewer's session (RLS of `notes`): its whole text, and whether the viewer
// may change it (its author).

/** null: the note is gone or out of reach. */
export async function loadNoteSheet(
  noteId: string,
): Promise<NoteSheetData | null> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(noteId).success) return null;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("notes")
    .select(WRITTEN_NOTE_SELECT)
    .eq("id", noteId)
    .maybeSingle();
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    link: noteLinkOf(row),
    author: authorOf(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mine: access.personId === row.created_by,
  };
}
