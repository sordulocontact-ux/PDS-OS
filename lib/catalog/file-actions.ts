"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  FILE_BUCKETS,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_BYTES,
  isCatalogFilePath,
  isFileCategory,
  isLibraryCategory,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Writes of artist and master files, with the user's session: RLS
// (manage_catalog) and column grants decide; the permission check only
// gives a clean message.

type Result = { ok: true } | { ok: false; error: string };

const ownerSchema = z.object({
  kind: z.enum(["artist", "master"]),
  id: catalogIdSchema,
});

// Blank means none (null), as the database wants it.
const descriptionSchema = z
  .string()
  .trim()
  .max(MAX_DESCRIPTION_LENGTH)
  .nullish()
  .transform((value) => value || null);

const fileNameSchema = z.string().trim().min(1).max(255);

const recordSchema = z
  .object({
    owner: ownerSchema,
    path: z.string().max(200),
    category: z.string(),
    description: descriptionSchema,
    fileName: fileNameSchema,
    mime: z.string().trim().min(1).max(255),
    bytes: z.number().int().positive().max(MAX_FILE_BYTES),
    // An audio version of a title: the state it stands for, and the
    // duration the browser read from it (null when it could not).
    audioState: z.enum(AUDIO_STATES).nullish(),
    durationSeconds: z.number().int().min(1).max(86399).nullish(),
  })
  .refine((input) => isFileCategory(input.owner.kind, input.category))
  .refine(
    (input) =>
      (input.category === "audio" && input.owner.kind === "master") ===
      Boolean(input.audioState),
  );

const deleteSchema = z.object({ owner: ownerSchema, fileId: z.uuid() });

// A title's audio versions are not edited here (RLS refuses them too).
const updateSchema = z
  .object({
    owner: ownerSchema,
    fileId: z.uuid(),
    fileName: fileNameSchema,
    category: z.string(),
    description: descriptionSchema,
  })
  .refine((input) => isLibraryCategory(input.owner.kind, input.category));

async function catalogAccess() {
  const access = await requireApproved();
  return access.organizationId && can(access, "manage_catalog")
    ? access.organizationId
    : null;
}

function refresh(owner: FileOwner) {
  if (owner.kind === "artist") {
    revalidatePath(routes.artistFiles(owner.id));
    revalidatePath(routes.artistActivity(owner.id));
  } else {
    // Every tab of the master: the overview counts the master file.
    revalidatePath(routes.master(owner.id), "layout");
  }
}

// The browser uploaded the object (storage RLS); this records it.
export async function recordCatalogFile(
  input: z.input<typeof recordSchema>,
): Promise<Result> {
  const t = fr.catalogFiles;
  const organizationId = await catalogAccess();
  const parsed = recordSchema.safeParse(input);
  if (!organizationId || !parsed.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  const { owner, path, category, description, fileName, mime, bytes } =
    parsed.data;
  const audio =
    category === "audio"
      ? {
          audio_state: parsed.data.audioState,
          duration_seconds: parsed.data.durationSeconds ?? null,
        }
      : {};
  if (!isCatalogFilePath(path, organizationId, owner.id))
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const row = {
    organization_id: organizationId,
    category,
    description,
    path,
    file_name: fileName,
    mime,
    bytes,
  };
  const { error } =
    owner.kind === "artist"
      ? await supabase
          .from("artist_files")
          .insert({ ...row, artist_id: owner.id })
      : await supabase
          .from("master_files")
          .insert({ ...row, ...audio, master_id: owner.id });
  if (error) {
    console.error("recordCatalogFile:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(owner);
  return { ok: true };
}

// Name, category and precision: reclassifying moves the one file from a
// view to another (and a contract out of, or into, restricted reading).
export async function updateCatalogFile(
  input: z.input<typeof updateSchema>,
): Promise<Result> {
  const t = fr.catalogFiles;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  if (!(await catalogAccess()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { owner, fileId, fileName, category, description } = parsed.data;

  const supabase = await createClient();
  const values = { file_name: fileName, category, description };
  const { data, error } =
    owner.kind === "artist"
      ? await supabase
          .from("artist_files")
          .update(values)
          .eq("id", fileId)
          .eq("artist_id", owner.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("master_files")
          .update(values)
          .eq("id", fileId)
          .eq("master_id", owner.id)
          .select("id")
          .maybeSingle();
  if (error || !data) {
    if (error) console.error("updateCatalogFile:", error.message);
    return { ok: false, error: t.updateFailed };
  }
  refresh(owner);
  return { ok: true };
}

// Deletes the row first (the object without a row is unreachable), then
// the object.
export async function deleteCatalogFile(
  input: z.input<typeof deleteSchema>,
): Promise<Result> {
  const t = fr.catalogFiles;
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success || !(await catalogAccess()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { owner, fileId } = parsed.data;

  const supabase = await createClient();
  const { data, error } =
    owner.kind === "artist"
      ? await supabase
          .from("artist_files")
          .delete()
          .eq("id", fileId)
          .eq("artist_id", owner.id)
          .select("path")
          .maybeSingle()
      : await supabase
          .from("master_files")
          .delete()
          .eq("id", fileId)
          .eq("master_id", owner.id)
          .select("path")
          .maybeSingle();
  if (error || !data) {
    if (error) console.error("deleteCatalogFile:", error.message);
    return { ok: false, error: t.deleteFailed };
  }
  const removed = await supabase.storage
    .from(FILE_BUCKETS[owner.kind])
    .remove([data.path]);
  if (removed.error)
    console.error("deleteCatalogFile (object):", removed.error.message);
  refresh(owner);
  return { ok: true };
}
