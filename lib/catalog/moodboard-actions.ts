"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import {
  MAX_MOODBOARD_NOTE,
  MAX_MOODBOARD_TITLE,
} from "@/lib/catalog/moodboard-rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  figmaReady,
  parseFigmaLink,
  readFigmaBoards,
} from "@/lib/integrations/figma";
import { IntegrationError } from "@/lib/integrations/http";
import { downloadImage } from "@/lib/integrations/images";
import { createClient } from "@/lib/supabase/server";

// An artist's moodboard folders (retour du 10/11/2026), written with the
// user's session: RLS decides (the Catalogue on every folder, a creative
// director on his own); the permission check only gives a clean message.

type Result = { ok: true } | { ok: false; error: string };

const titleSchema = z.string().trim().min(1).max(MAX_MOODBOARD_TITLE);
// Blank means none (null), as the database wants it.
const noteSchema = z
  .string()
  .trim()
  .max(MAX_MOODBOARD_NOTE)
  .nullish()
  .transform((value) => value || null);

const createSchema = z.object({
  artistId: catalogIdSchema,
  title: titleSchema,
  note: noteSchema,
});
const updateSchema = createSchema.extend({ moodboardId: z.uuid() });
const deleteSchema = z.object({
  artistId: catalogIdSchema,
  moodboardId: z.uuid(),
});
const importSchema = z.object({
  artistId: catalogIdSchema,
  link: z.string().trim().min(1).max(1000),
});

/** The organization to write in, when the viewer may write moodboards. */
async function writerOrganization(): Promise<string | null> {
  const access = await requireApproved();
  const allowed = can(access, "manage_catalog") || can(access, "creative_work");
  return allowed ? access.organizationId : null;
}

function refresh(artistId: string) {
  revalidatePath(routes.artistIdentity(artistId));
  revalidatePath(routes.artistFiles(artistId));
  revalidatePath(routes.artistActivity(artistId));
}

/** « Nouveau moodboard »: an empty folder, filled afterwards. */
export async function createArtistMoodboard(
  input: z.input<typeof createSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.artistIdentity.moodboards.errors;
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  const organizationId = await writerOrganization();
  if (!organizationId) return { ok: false, error: fr.auth.errors.forbidden };
  const { artistId, title, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_moodboards")
    .insert({
      organization_id: organizationId,
      artist_id: artistId,
      title,
      note,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createArtistMoodboard:", error?.message);
    return { ok: false, error: t.failed };
  }
  refresh(artistId);
  return { ok: true, id: data.id };
}

/** Its title and intention. */
export async function updateArtistMoodboard(
  input: z.input<typeof updateSchema>,
): Promise<Result> {
  const t = fr.artistIdentity.moodboards.errors;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  if (!(await writerOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { artistId, moodboardId, title, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_moodboards")
    .update({ title, note })
    .eq("id", moodboardId)
    .eq("artist_id", artistId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("updateArtistMoodboard:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(artistId);
  return { ok: true };
}

/**
 * The folder and its images: the images first (rows, then their objects),
 * then the empty folder. An image someone else added that this viewer may
 * not delete keeps the folder (said, not a silent failure).
 */
export async function deleteArtistMoodboard(
  input: z.input<typeof deleteSchema>,
): Promise<Result> {
  const t = fr.artistIdentity.moodboards.errors;
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success || !(await writerOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { artistId, moodboardId } = parsed.data;

  const supabase = await createClient();
  const { data: removed, error: filesError } = await supabase
    .from("artist_files")
    .delete()
    .eq("artist_id", artistId)
    .eq("moodboard_id", moodboardId)
    .select("path");
  if (filesError) {
    console.error("deleteArtistMoodboard (files):", filesError.message);
    return { ok: false, error: t.deleteFailed };
  }
  const paths = (removed ?? []).map((row) => row.path);
  if (paths.length > 0) {
    const objects = await supabase.storage
      .from(FILE_BUCKETS.artist)
      .remove(paths);
    if (objects.error)
      console.error("deleteArtistMoodboard (objects):", objects.error.message);
  }
  const { data, error } = await supabase
    .from("artist_moodboards")
    .delete()
    .eq("id", moodboardId)
    .eq("artist_id", artistId)
    .select("id")
    .maybeSingle();
  refresh(artistId);
  if (error || !data) {
    if (error) console.error("deleteArtistMoodboard:", error.message);
    // 23503: images of others are left inside.
    return {
      ok: false,
      error: error?.code === "23503" ? t.deleteBlocked : t.deleteFailed,
    };
  }
  return { ok: true };
}

// A file name for the library: the layer's name, never a path.
function pngName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim();
  return `${(clean || "Image").slice(0, 200)}.png`;
}

// Downloads a few renders at once, in their order.
async function inBatches<T, R>(
  items: T[],
  size: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size)
    results.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  return results;
}

const FIGMA_ERRORS = [
  "not_configured",
  "not_found",
  "forbidden",
  "rate_limited",
  "empty",
] as const;

/**
 * « Importer depuis Figma »: each board of the link (a frame, or every
 * frame of a page, lib/integrations/figma.ts) becomes a folder holding its
 * images, rendered as PNG and stored in the artist's library like an image
 * dropped by hand. A board whose images all failed is not kept.
 */
export async function importFigmaMoodboards(
  input: z.input<typeof importSchema>,
): Promise<
  | { ok: true; boards: number; images: number; failed: number }
  | { ok: false; error: string }
> {
  const t = fr.artistIdentity.moodboards.figma.errors;
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.link };
  const organizationId = await writerOrganization();
  if (!organizationId) return { ok: false, error: fr.auth.errors.forbidden };
  if (!figmaReady()) return { ok: false, error: t.not_configured };
  const { artistId } = parsed.data;
  const link = parseFigmaLink(parsed.data.link);
  if (!link) return { ok: false, error: t.link };

  let boards;
  try {
    boards = await readFigmaBoards(link);
  } catch (error) {
    const reason = error instanceof IntegrationError ? error.reason : "";
    const known = FIGMA_ERRORS.find((code) => code === reason);
    if (!known) console.error("importFigmaMoodboards:", error);
    return { ok: false, error: known ? t[known] : t.failed };
  }

  const supabase = await createClient();
  const bucket = supabase.storage.from(FILE_BUCKETS.artist);
  let keptBoards = 0;
  let keptImages = 0;
  let failed = 0;
  for (const board of boards) {
    const { data: folder, error: folderError } = await supabase
      .from("artist_moodboards")
      .insert({
        organization_id: organizationId,
        artist_id: artistId,
        title: board.title.slice(0, MAX_MOODBOARD_TITLE),
        source_url: board.sourceUrl,
      })
      .select("id")
      .single();
    if (folderError || !folder) {
      console.error("importFigmaMoodboards (folder):", folderError?.message);
      return keptBoards > 0
        ? { ok: true, boards: keptBoards, images: keptImages, failed }
        : { ok: false, error: t.failed };
    }

    // Stored in parallel, recorded in the board's order.
    const stored = await inBatches(board.images, 4, async (image) => {
      try {
        const { data } = await downloadImage("figma", image.url);
        const path = `${organizationId}/${artistId}/${crypto.randomUUID()}.png`;
        const { error } = await bucket.upload(path, data, {
          contentType: "image/png",
          upsert: false,
        });
        if (error) throw new Error(error.message);
        return { path, name: image.name, bytes: data.byteLength };
      } catch (error) {
        console.error("importFigmaMoodboards (image):", error);
        return null;
      }
    });
    let inFolder = 0;
    for (const file of stored) {
      if (!file) {
        failed++;
        continue;
      }
      const { error } = await supabase.from("artist_files").insert({
        organization_id: organizationId,
        artist_id: artistId,
        category: "moodboard",
        moodboard_id: folder.id,
        path: file.path,
        file_name: pngName(file.name),
        mime: "image/png",
        bytes: file.bytes,
      });
      if (error) {
        console.error("importFigmaMoodboards (record):", error.message);
        await bucket.remove([file.path]);
        failed++;
        continue;
      }
      inFolder++;
    }
    if (inFolder === 0) {
      await supabase.from("artist_moodboards").delete().eq("id", folder.id);
      continue;
    }
    keptBoards++;
    keptImages += inFolder;
  }
  refresh(artistId);
  if (keptBoards === 0) return { ok: false, error: t.failed };
  return { ok: true, boards: keptBoards, images: keptImages, failed };
}
