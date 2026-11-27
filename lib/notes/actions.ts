"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { notes } from "@/lib/i18n/fr/notes";
import { createClient } from "@/lib/supabase/server";
import type { WriteDone } from "@/lib/utils/write-result";

/**
 * Writes of the written notes, with the user's session: the RLS of `notes`
 * (20261127180101) decides. Any approved member writes one, on a project he
 * sees; only its author changes or deletes it.
 */

export type NoteField = "title" | "body";

/** A WriteResult; on failure, the fields to show in red with their reason. */
export type NoteWriteResult =
  | (WriteDone & { id: string })
  | {
      ok: false;
      error: string;
      fields?: Partial<Record<NoteField, string>>;
    };

const TITLE_MAX = 200;
const BODY_MAX = 20000;

const fieldsSchema = z.object({
  title: z.string(),
  body: z.string(),
  projectId: z.uuid().nullable(),
});

export type NoteInput = z.input<typeof fieldsSchema>;

const t = notes.errors;

/** The missing or too long fields, each with its reason; null when none. */
function checkFields(input: { title: string; body: string }) {
  const fields: Partial<Record<NoteField, string>> = {};
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) fields.title = t.titleRequired;
  else if (title.length > TITLE_MAX) fields.title = t.titleTooLong;
  if (!body) fields.body = t.bodyRequired;
  else if (body.length > BODY_MAX) fields.body = t.bodyTooLong;
  const count = Object.keys(fields).length;
  return count > 0
    ? { ok: false as const, error: t.missing(count), fields }
    : null;
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

/** A new note, its author the viewer; on a project he sees, or the team's. */
export async function createNote(input: NoteInput): Promise<NoteWriteResult> {
  const access = await requireApproved();
  const parsed = fieldsSchema.safeParse(input);
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.generic };
  const invalid = checkFields(parsed.data);
  if (invalid) return invalid;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      organization_id: access.organizationId,
      project_id: v.projectId,
      title: v.title.trim(),
      body: v.body.trim(),
    })
    .select("id")
    .single();
  if (error) return failure("createNote", error);
  revalidateNotes(v.projectId);
  return { ok: true, id: data.id, done: notes.form.created };
}

/** Its title, text or project; its author only (RLS). */
export async function updateNote(
  input: NoteInput & { id: string },
): Promise<NoteWriteResult> {
  await requireApproved();
  const parsed = fieldsSchema.extend({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: t.notFound };
  const invalid = checkFields(parsed.data);
  if (invalid) return invalid;
  const v = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("notes")
    .select("project_id")
    .eq("id", v.id)
    .maybeSingle();
  if (!before) return { ok: false, error: t.notFound };
  const { data, error } = await supabase
    .from("notes")
    .update({
      title: v.title.trim(),
      body: v.body.trim(),
      project_id: v.projectId,
    })
    .eq("id", v.id)
    .select("id");
  if (error) return failure("updateNote", error);
  if (data.length === 0) return { ok: false, error: t.forbidden };
  revalidateNotes(before.project_id, v.projectId);
  return { ok: true, id: v.id, done: notes.form.saved };
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
