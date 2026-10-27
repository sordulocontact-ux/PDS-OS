import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { Visual } from "@/lib/strategy/documents/release-plan-model";
import { createClient } from "@/lib/supabase/client";

const fr = { strategyReleasePlan };

const BUCKET = "document-visuals";
const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Browser-side: an image dropped in the Plan de sortie generator goes
 * straight to the public bucket the documents read from, under
 * "<org>/<project>/<uuid>.<ext>" (storage policy: the project's owner only).
 */
export async function uploadDocumentVisual(input: {
  organizationId: string;
  projectId: string;
  file: File;
}): Promise<{ ok: true; visual: Visual } | { ok: false; error: string }> {
  const t = fr.strategyReleasePlan.visuals;
  const ext = EXTENSIONS[input.file.type];
  if (!ext) return { ok: false, error: t.badType };
  if (input.file.size > MAX_BYTES) return { ok: false, error: t.tooBig };
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (error) {
    console.error("[release-plan] visual upload failed:", error.message);
    return { ok: false, error: t.uploadFailed };
  }
  return {
    ok: true,
    visual: { source: "upload", path, name: input.file.name.slice(0, 200) },
  };
}

/** The public URL of an image in the documents' bucket. */
export const documentVisualUrl = (path: string) =>
  createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
