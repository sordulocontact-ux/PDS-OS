"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ARTIST_FILE_BUCKET,
  FILE_CATEGORIES,
  MAX_FILE_BYTES,
  isArtistFilePath,
} from "@/lib/catalog/file-rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Artist file writes, with the user's session: RLS (manage_catalog) and
// column grants decide; the permission check only gives a clean message.

type Result = { ok: true } | { ok: false; error: string };

const recordSchema = z.object({
  artistId: catalogIdSchema,
  path: z.string().max(200),
  category: z.enum(FILE_CATEGORIES),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(MAX_FILE_BYTES),
});

const deleteSchema = z.object({
  artistId: catalogIdSchema,
  fileId: z.uuid(),
});

async function catalogAccess() {
  const access = await requireApproved();
  return access.organizationId && can(access, "manage_catalog")
    ? access.organizationId
    : null;
}

function refresh(artistId: string) {
  revalidatePath(routes.artistFiles(artistId));
  revalidatePath(routes.artistActivity(artistId));
}

// The browser uploaded the object (storage RLS); this records it.
export async function recordArtistFile(
  input: z.input<typeof recordSchema>,
): Promise<Result> {
  const t = fr.artistFiles;
  const organizationId = await catalogAccess();
  const parsed = recordSchema.safeParse(input);
  if (!organizationId || !parsed.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  const { artistId, path, category, fileName, mime, bytes } = parsed.data;
  if (!isArtistFilePath(path, organizationId, artistId))
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { error } = await supabase.from("artist_files").insert({
    organization_id: organizationId,
    artist_id: artistId,
    category,
    path,
    file_name: fileName,
    mime,
    bytes,
  });
  if (error) {
    console.error("recordArtistFile:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(artistId);
  return { ok: true };
}

// Deletes the row first (the object without a row is unreachable), then
// the object.
export async function deleteArtistFile(
  input: z.input<typeof deleteSchema>,
): Promise<Result> {
  const t = fr.artistFiles;
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success || !(await catalogAccess()))
    return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_files")
    .delete()
    .eq("id", parsed.data.fileId)
    .eq("artist_id", parsed.data.artistId)
    .select("path")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("deleteArtistFile:", error.message);
    return { ok: false, error: t.deleteFailed };
  }
  const removed = await supabase.storage
    .from(ARTIST_FILE_BUCKET)
    .remove([data.path]);
  if (removed.error)
    console.error("deleteArtistFile (object):", removed.error.message);
  refresh(parsed.data.artistId);
  return { ok: true };
}
