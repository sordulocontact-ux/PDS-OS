import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { trackedCache } from "@/lib/projects/live-deps";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Client = SupabaseClient<Database>;

export type NoteSearchHits = { callIds: Set<string>; noteIds: Set<string> };

// The RPC reads 200 characters at most.
const QUERY_MAX = 200;

/**
 * The calls (title, report, report items, transcript, summary sent) and the
 * written notes whose text matches `query`: SQL search_notes, French full
 * text with an ilike fallback on titles, run with the user's session (RLS).
 */
export async function searchNoteIds(
  supabase: Client,
  query: string,
): Promise<NoteSearchHits> {
  const hits: NoteSearchHits = { callIds: new Set(), noteIds: new Set() };
  const text = query.trim().slice(0, QUERY_MAX);
  if (!text) return hits;
  const { data, error } = await supabase.rpc("search_notes", {
    p_query: text,
  });
  if (error) throw new Error(`searchNoteIds: ${error.message}`);
  for (const row of data) {
    if (row.kind === "call") hits.callIds.add(row.id);
    else if (row.kind === "note") hits.noteIds.add(row.id);
  }
  return hits;
}

/** searchNoteIds with the request's session, shared within a render. */
export const getNoteSearch = trackedCache(
  async (query: string): Promise<NoteSearchHits> =>
    searchNoteIds(await createClient(), query),
);
