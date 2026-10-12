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
  isAudioFile,
  isCatalogFilePath,
  isFileCategory,
  isLibraryCategory,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { audioDeleteBlock, audioReviewOf } from "@/lib/catalog/audio-versions";
import { WORK_STATUSES } from "@/lib/catalog/master/rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Writes of artist, title, project and contract files, with the user's
// session: RLS and column grants decide (manage_catalog for the catalog, the
// project's owner for a project, the contract's owner or the direction for a
// contract); the permission check only gives a clean message.

type Result = { ok: true } | { ok: false; error: string };

// One table per owner kind. Insert stays per table (each has its own owner
// column and extras); reads, renames and deletes only touch the columns the
// four tables share, so they go through one of them for typing: the
// project's (same shared columns, `project_id` standing for the owner).
const FILE_TABLES = {
  artist: "artist_files",
  master: "master_files",
  project: "project_files",
  contract: "contract_files",
} as const satisfies Record<FileOwner["kind"], string>;

const OWNER_COLUMNS = {
  artist: "artist_id",
  master: "master_id",
  project: "project_id",
  contract: "contract_id",
} as const satisfies Record<FileOwner["kind"], string>;

function sharedFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  owner: FileOwner,
) {
  return {
    table: () => supabase.from(FILE_TABLES[owner.kind] as "project_files"),
    ownerColumn: OWNER_COLUMNS[owner.kind] as "project_id",
  };
}

const ownerSchema = z.object({
  kind: z.enum(["artist", "master", "project", "contract"]),
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
    // A new version of this file (same owner, the database checks).
    replacesId: z.uuid().nullish(),
    // An audio version of a title: the state it stands for, and the
    // duration the browser read from it (null when it could not).
    audioState: z.enum(AUDIO_STATES).nullish(),
    durationSeconds: z.number().int().min(1).max(86399).nullish(),
    // A working file of a title (retours 36 et 38): its session, its state.
    sessionId: z.uuid().nullish(),
    workStatus: z.enum(WORK_STATUSES).nullish(),
  })
  .refine(
    (input) =>
      (!input.sessionId && !input.workStatus) ||
      (input.owner.kind === "master" && input.category === "stems"),
  )
  .refine((input) => isFileCategory(input.owner.kind, input.category))
  .refine(
    (input) =>
      (input.category === "audio" && input.owner.kind === "master") ===
      Boolean(input.audioState),
  )
  // An audio version is one of the announced formats (retour Catalogue 20).
  .refine(
    (input) =>
      input.category !== "audio" ||
      input.owner.kind !== "master" ||
      isAudioFile({ name: input.fileName, type: input.mime }),
  );

const deleteSchema = z.object({ owner: ownerSchema, fileId: z.uuid() });

// A title's audio versions are not edited here (RLS refuses them too).
// Category and precision apply to every version of the file; the name to
// this version only.
const updateSchema = z
  .object({
    owner: ownerSchema,
    fileId: z.uuid(),
    fileName: fileNameSchema,
    category: z.string(),
    description: descriptionSchema,
  })
  .refine((input) => isLibraryCategory(input.owner.kind, input.category));

// The organization to write in, when the viewer may write there at all.
// Inside a project, its owner writes, and its creative directors in Visuels
// and Autres (their own files): RLS checks which.
async function writerAccess(owner: FileOwner) {
  const access = await requireApproved();
  const allowed =
    owner.kind === "project"
      ? can(access, "pilot_projects") || can(access, "creative_work")
      : can(
          access,
          owner.kind === "contract" ? "manage_contracts" : "manage_catalog",
        );
  return access.organizationId && allowed ? access.organizationId : null;
}

function refresh(owner: FileOwner) {
  switch (owner.kind) {
    case "artist":
      revalidatePath(routes.artistFiles(owner.id));
      revalidatePath(routes.artistActivity(owner.id));
      return;
    case "master":
      // Every tab of the master: the overview counts the master file.
      revalidatePath(routes.master(owner.id), "layout");
      return;
    case "project":
      revalidatePath(routes.projectFiles(owner.id));
      revalidatePath(routes.projectActivity(owner.id));
      return;
    case "contract":
      revalidatePath(routes.contract(owner.id));
  }
  revalidatePath(routes.files);
}

// The browser uploaded the object (storage RLS); this records it.
export async function recordCatalogFile(
  input: z.input<typeof recordSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.catalogFiles;
  const parsed = recordSchema.safeParse(input);
  const organizationId = parsed.success
    ? await writerAccess(parsed.data.owner)
    : null;
  if (!organizationId || !parsed.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  const { owner, path, category, description, fileName, mime, bytes } =
    parsed.data;
  const replacesId = parsed.data.replacesId ?? null;
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
    replaces_id: replacesId,
  };
  const insert = () => {
    switch (owner.kind) {
      case "artist":
        return supabase
          .from("artist_files")
          .insert({ ...row, artist_id: owner.id });
      case "master":
        return supabase.from("master_files").insert({
          ...row,
          ...audio,
          master_id: owner.id,
          session_id: parsed.data.sessionId ?? null,
          work_status: parsed.data.workStatus ?? null,
        });
      case "project":
        return supabase
          .from("project_files")
          .insert({ ...row, project_id: owner.id });
      case "contract":
        return supabase
          .from("contract_files")
          .insert({ ...row, contract_id: owner.id });
    }
  };
  const { data, error } = await insert().select("id").single();
  if (error || !data) {
    console.error("recordCatalogFile:", error?.message);
    return { ok: false, error: t.failed };
  }
  refresh(owner);
  // The new file, for a record that keeps it (a budget line's proof).
  return { ok: true, id: data.id };
}

// Name, category and precision: reclassifying moves the one file from a
// view to another (and a contract out of, or into, restricted reading).
export async function updateCatalogFile(
  input: z.input<typeof updateSchema>,
): Promise<Result> {
  const t = fr.catalogFiles;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  const { owner, fileId, fileName, category, description } = parsed.data;
  if (!(await writerAccess(owner)))
    return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  const { table, ownerColumn } = sharedFiles(supabase, owner);
  // The version being edited: its series, within this owner.
  const { data: current, error: readError } = await table()
    .select("series_id")
    .eq("id", fileId)
    .eq(ownerColumn, owner.id)
    .maybeSingle();
  const renamed =
    current &&
    (await table()
      .update({ file_name: fileName })
      .eq("id", fileId)
      .select("id")
      .maybeSingle());
  const reclassified =
    current &&
    (await table()
      .update({ category, description })
      .eq("series_id", current.series_id)
      .eq(ownerColumn, owner.id)
      .select("id"));
  const error = readError ?? renamed?.error ?? reclassified?.error;
  if (error || !current || !renamed?.data) {
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
  if (!parsed.success || !(await writerAccess(parsed.data.owner)))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { owner, fileId } = parsed.data;

  const supabase = await createClient();
  const { table, ownerColumn } = sharedFiles(supabase, owner);
  // An approved audio version, or one a project's workflow uses, stays
  // (retour Catalogue 24; RLS refuses it too): said, not a silent failure.
  if (owner.kind === "master") {
    const blocked = await audioDeletionBlock(supabase, owner.id, fileId);
    if (blocked)
      return {
        ok: false,
        error: fr.masterPage.audio.versions.deleteBlocked[blocked],
      };
  }
  const remove = () =>
    table()
      .delete()
      .eq("id", fileId)
      .eq(ownerColumn, owner.id)
      .select("path")
      .maybeSingle();
  const { data, error } = await remove();
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

async function audioDeletionBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  masterId: string,
  fileId: string,
): Promise<"approved" | "inUse" | null> {
  const { data } = await supabase
    .from("master_files")
    .select("category, review_status")
    .eq("id", fileId)
    .eq("master_id", masterId)
    .maybeSingle();
  if (!data || data.category !== "audio") return null;
  const { data: inUse } = await supabase.rpc("master_file_in_use", {
    p_file_id: fileId,
  });
  return audioDeleteBlock({
    review: audioReviewOf(data.review_status),
    inUse: inUse === true,
  });
}
