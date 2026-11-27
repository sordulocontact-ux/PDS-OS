import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAccess } from "@/lib/auth/dal";
import { callViewOf } from "@/lib/calls/format";
import { listAllCalls, type CallListItem } from "@/lib/calls/queries";
import {
  excerptOf,
  noteDateOf,
  type CallNoteRow,
  type NotePerson,
  type NoteRow,
  type WrittenNoteRow,
} from "@/lib/notes/views";
import { trackedCache } from "@/lib/projects/live-deps";
import { personName } from "@/lib/projects/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Read side of the Notes page: the calls the viewer sees (listAllCalls, RLS
 * can_see_call) with their content, and the written notes (RLS of `notes`).
 * Every read runs with the user's session.
 */

type Client = SupabaseClient<Database>;

// Most recent first; a team of 3 to 5 people stays far below this.
const NOTES_LIMIT = 500;
// Ids per `in.(…)` filter, so the request's URL stays short.
const CHUNK = 100;

/** Every row of the Notes page, newest first; `projectId`: one project's. */
export async function listNoteRows(
  supabase: Client,
  { projectId, now }: { projectId?: string; now: Date },
): Promise<NoteRow[]> {
  const [calls, written] = await Promise.all([
    listAllCalls(supabase, { projectId }),
    listWrittenNotes(supabase, projectId),
  ]);
  const callRows = await withContent(supabase, calls, now);
  return [...callRows, ...written].sort((a, b) =>
    noteDateOf(b).localeCompare(noteDateOf(a)),
  );
}

/** listNoteRows with the request's session, shared within a render. */
export const getNoteRows = trackedCache(
  async (projectId: string | null): Promise<NoteRow[]> =>
    listNoteRows(await createClient(), {
      projectId: projectId ?? undefined,
      now: new Date(),
    }),
);

async function listWrittenNotes(
  supabase: Client,
  projectId: string | undefined,
): Promise<WrittenNoteRow[]> {
  let query = supabase
    .from("notes")
    .select(
      "id, title, body, project_id, created_by, created_at, updated_at, project:projects!notes_project_same_org(title), author:people!notes_created_by_fkey(first_name, last_name)",
    );
  if (projectId) query = query.eq("project_id", projectId);
  const [{ data, error }, access] = await Promise.all([
    query.order("updated_at", { ascending: false }).limit(NOTES_LIMIT),
    getAccess(),
  ]);
  if (error) throw new Error(`listWrittenNotes: ${error.message}`);
  return data.map((row) => ({
    kind: "written",
    id: row.id,
    title: row.title,
    excerpt: excerptOf(row.body),
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
  }));
}

/**
 * Each call with its members and, once it is past, its latest report's
 * summary (else the latest summary sent): three grouped reads, never one
 * per call.
 */
async function withContent(
  supabase: Client,
  calls: CallListItem[],
  now: Date,
): Promise<CallNoteRow[]> {
  const ids = calls.map((call) => call.id);
  const pastIds = calls
    .filter((call) => callViewOf(call, now) === "past")
    .map((call) => call.id);
  const [people, reports, summaries] = await Promise.all([
    readAttendees(supabase, ids),
    readLatest(supabase, "call_reports", pastIds),
    readLatest(supabase, "call_summaries", pastIds),
  ]);
  return calls.map((call) => {
    const report = reports.get(call.id);
    const text = report ?? summaries.get(call.id) ?? null;
    return {
      kind: "call",
      call,
      excerpt: text ? excerptOf(text) : null,
      people: people.get(call.id) ?? [],
      hasReport: report !== undefined,
    };
  });
}

function chunks(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
  return out;
}

async function readAttendees(
  supabase: Client,
  ids: string[],
): Promise<Map<string, NotePerson[]>> {
  const byCall = new Map<string, NotePerson[]>();
  const parts = await Promise.all(
    chunks(ids).map((part) =>
      supabase
        .from("call_attendees")
        .select(
          "call_id, person_id, created_at, person:people!call_attendees_person_id_fkey(first_name, last_name)",
        )
        .in("call_id", part)
        .order("created_at"),
    ),
  );
  for (const { data, error } of parts) {
    if (error) throw new Error(`readAttendees: ${error.message}`);
    for (const row of data) {
      if (!row.person) continue;
      const list = byCall.get(row.call_id) ?? [];
      list.push({
        personId: row.person_id,
        name: personName(row.person.first_name, row.person.last_name),
      });
      byCall.set(row.call_id, list);
    }
  }
  return byCall;
}

/** The latest report summary, or summary sent, of each call. */
async function readLatest(
  supabase: Client,
  table: "call_reports" | "call_summaries",
  ids: string[],
): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  const parts = await Promise.all(
    chunks(ids).map((part) =>
      table === "call_reports"
        ? supabase
            .from("call_reports")
            .select("call_id, text:summary")
            .in("call_id", part)
            .order("created_at", { ascending: false })
        : supabase
            .from("call_summaries")
            .select("call_id, text")
            .in("call_id", part)
            .order("sent_at", { ascending: false }),
    ),
  );
  for (const { data, error } of parts) {
    if (error) throw new Error(`readLatest(${table}): ${error.message}`);
    for (const row of data)
      if (!latest.has(row.call_id)) latest.set(row.call_id, row.text);
  }
  return latest;
}
