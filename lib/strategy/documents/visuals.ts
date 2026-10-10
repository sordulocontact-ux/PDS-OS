import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { ARTIST_PICTURE_BUCKET } from "@/lib/catalog/picture-rules";
import type {
  DocImage,
  Visual,
} from "@/lib/strategy/documents/release-plan-model";
import { VISUALS_BUCKET } from "@/lib/strategy/documents/release-plan-sources";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
// Deezer's image CDN: the only outside host an artist picture comes from.
const DEEZER_IMAGE = /^https:\/\/([a-z0-9-]+\.)*dzcdn\.net\//i;

/** Where a private visual lives, read again with the user's session (RLS). */
async function locate(
  supabase: Client,
  visual: Extract<Visual, { id: string }>,
): Promise<{ bucket: string; path: string } | { url: string } | null> {
  if (visual.source === "artist_picture") {
    const { data } = await supabase
      .from("artists")
      .select("picture_path, picture_url")
      .eq("id", visual.id)
      .maybeSingle();
    if (data?.picture_path)
      return { bucket: ARTIST_PICTURE_BUCKET, path: data.picture_path };
    return data?.picture_url && DEEZER_IMAGE.test(data.picture_url)
      ? { url: data.picture_url }
      : null;
  }
  const { data } =
    visual.source === "project_file"
      ? await supabase
          .from("project_files")
          .select("path, mime")
          .eq("id", visual.id)
          .maybeSingle()
      : await supabase
          .from("master_files")
          .select("path, mime")
          .eq("id", visual.id)
          .maybeSingle();
  if (!data || !data.mime.startsWith("image/")) return null;
  return {
    bucket:
      visual.source === "project_file"
        ? FILE_BUCKETS.project
        : FILE_BUCKETS.master,
    path: data.path,
  };
}

async function read(
  supabase: Client,
  where: { bucket: string; path: string } | { url: string },
): Promise<Blob | null> {
  if ("url" in where) {
    const response = await fetch(where.url, { redirect: "error" }).catch(
      () => null,
    );
    return response?.ok ? response.blob() : null;
  }
  const { data } = await supabase.storage
    .from(where.bucket)
    .download(where.path);
  return data ?? null;
}

/**
 * The visuals the owner allowed, as the document shows them: private files
 * are copied into the public bucket a version reads from (the shared page
 * and the PDF have no session), under "<org>/<project>/<uuid>.<ext>" (the
 * storage policy lets the project's owner alone write there); images
 * dropped in the generator already live there; a reference keeps its https
 * link. A visual that cannot be read is left out.
 */
export async function publishVisuals(
  supabase: Client,
  organizationId: string,
  projectId: string,
  visuals: Visual[],
): Promise<DocImage[]> {
  const images: DocImage[] = [];
  for (const visual of visuals) {
    if (visual.source === "upload") {
      images.push({
        url: supabase.storage.from(VISUALS_BUCKET).getPublicUrl(visual.path)
          .data.publicUrl,
        alt: visual.name,
      });
      continue;
    }
    if (visual.source === "reference") {
      images.push({ url: visual.url, alt: visual.name });
      continue;
    }
    const where = await locate(supabase, visual);
    const blob = where ? await read(supabase, where) : null;
    const extension = blob ? EXTENSIONS[blob.type] : undefined;
    if (!blob || !extension || blob.size > MAX_BYTES) continue;
    const path = `${organizationId}/${projectId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(VISUALS_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) {
      console.error("publishVisuals:", error.message);
      continue;
    }
    images.push({
      url: supabase.storage.from(VISUALS_BUCKET).getPublicUrl(path).data
        .publicUrl,
      alt: visual.name,
    });
  }
  return images;
}
