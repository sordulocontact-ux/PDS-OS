"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { NoteSheetData } from "@/lib/notes/views";
import { personName } from "@/lib/projects/types";
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
    .select(
      "id, title, body, project_id, created_by, created_at, updated_at, project:projects!notes_project_same_org(title), author:people!notes_created_by_fkey(first_name, last_name)",
    )
    .eq("id", noteId)
    .maybeSingle();
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    projectId: row.project_id,
    projectTitle: row.project?.title ?? null,
    author: {
      personId: row.created_by,
      name: row.author
        ? personName(row.author.first_name, row.author.last_name)
        : "",
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mine: access.personId === row.created_by,
  };
}
