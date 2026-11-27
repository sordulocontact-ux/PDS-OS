"use server";

import { requireApproved } from "@/lib/auth/dal";
import { searchNoteIds } from "@/lib/notes/search";
import { createClient } from "@/lib/supabase/server";

/** The ids a text search found, as plain arrays (a client component's state). */
export type NoteTextHits = { callIds: string[]; noteIds: string[] };

/**
 * The calls and written notes whose text (report, transcript, note) matches
 * `query`, for the Notes page's search: the user's session, so RLS keeps what
 * he does not see out.
 */
export async function searchNotesText(query: string): Promise<NoteTextHits> {
  await requireApproved();
  const hits = await searchNoteIds(await createClient(), query);
  return { callIds: [...hits.callIds], noteIds: [...hits.noteIds] };
}
