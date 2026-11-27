"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { notes } from "@/lib/i18n/fr/notes";
import { NOTE_LINK_KINDS } from "@/lib/notes/views";
import { createClient } from "@/lib/supabase/server";
import type { WriteDone } from "@/lib/utils/write-result";

/**
 * Writes of the written notes, with the user's session: the RLS of `notes`
 * (20261127180101, 20261127210101) decides. Any approved member writes one,
 * linked to a project, a deal or a contract he reads (or to none); only its
 * author changes or deletes it. A note is a document saved as one types
 * (NoteDocument): a title left empty is saved « Sans titre », the text may
 * be empty.
 */

/** A WriteResult with the note's id. */
export type NoteWriteResult =
  (WriteDone & { id: string }) | { ok: false; error: string };

const TITLE_MAX = 200;
const BODY_MAX = 20000;

const fieldsSchema = z.object({
  title: z.string(),
  body: z.string(),
  link: z.object({ kind: z.enum(NOTE_LINK_KINDS), id: z.uuid() }).nullable(),
});

export type NoteInput = z.input<typeof fieldsSchema>;

const t = notes.errors;

/** The row's columns: the title (« Sans titre » when empty), the text, and
 * the one link column set; null with the reason when too long. */
function columnsOf(input: z.output<typeof fieldsSchema>) {
  const title = input.title.trim() || notes.untitled;
  const body = input.body.trim();
  if (title.length > TITLE_MAX) return { error: t.titleTooLong };
  if (body.length > BODY_MAX) return { error: t.bodyTooLong };
  const { link } = input;
  return {
    columns: {
      title,
      body,
      project_id: link?.kind === "project" ? link.id : null,
      deal_id: link?.kind === "deal" ? link.id : null,
      contract_id: link?.kind === "contract" ? link.id : null,
    },
  };
}

function failure(where: string, error: { code?: string; message: string }) {
  if (error.code === "42501") return { ok: false as const, error: t.forbidden };
  console.error(`${where}:`, error.message);
  return { ok: false as const, error: t.generic };
}

function revalidateNotes(...projectIds: Array<string | null | undefined>) {
  revalidatePath(routes.notes);
  for (const id of new Set(projectIds))
    if (id) revalidatePath(routes.projectNotes(id));
}

/** A new note, its author the viewer; linked to a record he reads, or the
 * team's. */
export async function createNote(input: NoteInput): Promise<NoteWriteResult> {
  const access = await requireApproved();
  const parsed = fieldsSchema.safeParse(input);
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.generic };
  const row = columnsOf(parsed.data);
  if (!row.columns) return { ok: false, error: row.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ organization_id: access.organizationId, ...row.columns })
    .select("id")
    .single();
  if (error) return failure("createNote", error);
  revalidateNotes(row.columns.project_id);
  return { ok: true, id: data.id, done: notes.document.saved };
}

/** Its title, text or link; its author only (RLS). */
export async function updateNote(
  input: NoteInput & { id: string },
): Promise<NoteWriteResult> {
  await requireApproved();
  const parsed = fieldsSchema.extend({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: t.notFound };
  const row = columnsOf(parsed.data);
  if (!row.columns) return { ok: false, error: row.error };
  const id = parsed.data.id;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("notes")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, error: t.notFound };
  const { data, error } = await supabase
    .from("notes")
    .update(row.columns)
    .eq("id", id)
    .select("id");
  if (error) return failure("updateNote", error);
  if (data.length === 0) return { ok: false, error: t.forbidden };
  revalidateNotes(before.project_id, row.columns.project_id);
  return { ok: true, id, done: notes.document.saved };
}

/** Deleted for good; its author only (RLS). */
export async function deleteNote(noteId: string): Promise<NoteWriteResult> {
  await requireApproved();
  if (!z.uuid().safeParse(noteId).success)
    return { ok: false, error: t.notFound };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .select("id, project_id");
  if (error) return failure("deleteNote", error);
  if (data.length === 0) return { ok: false, error: t.forbidden };
  revalidateNotes(data[0]?.project_id);
  return { ok: true, id: noteId, done: notes.remove.done };
}
