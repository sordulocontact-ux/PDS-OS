import { fileExtension } from "@/lib/catalog/file-rules";
import {
  linkExistingFile,
  recordReferenceFile,
} from "@/lib/design/actions/reference-files";
import type { ReferenceResult } from "@/lib/design/reference-db";
import {
  referenceUsageOf,
  type ProtoReferenceType,
} from "@/lib/design/reference-kinds";
import {
  MAX_REFERENCE_BYTES,
  REFERENCE_BUCKET,
  isReferenceMime,
} from "@/lib/design/reference-rules";
import { conceptionRefs } from "@/lib/i18n/fr/conception-refs";
import { createClient } from "@/lib/supabase/client";

const fr = { conceptionRefs };

/** The file's SHA-256, in hex: what tells two deposits of one file apart. */
async function sha256Of(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Browser-side deposit of one reference file: hashed first — a file the
 * project already holds is never uploaded again, it only gains links —
 * otherwise uploaded straight to the private bucket (storage RLS), then
 * recorded by a server action that checks the path again. An object that
 * could not be recorded is removed.
 */
export async function uploadReferenceFile(input: {
  organizationId: string;
  projectId: string;
  file: File;
  title: string;
  note: string;
  targets: string[];
  // MKT-C2-09: what it is, and its rights of use.
  type: ProtoReferenceType;
  usage: string | null;
}): Promise<ReferenceResult> {
  const t = fr.conceptionRefs.add;
  const { file } = input;
  if (file.size === 0 || file.size > MAX_REFERENCE_BYTES)
    return { ok: false, error: t.tooLarge(file.name) };
  if (!isReferenceMime(file.type))
    return { ok: false, error: t.wrongType(file.name) };

  const sha256 = await sha256Of(file);
  const existing = await linkExistingFile({
    projectId: input.projectId,
    sha256,
    targets: input.targets,
  });
  if (existing) return existing;

  const ext = fileExtension(file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const bucket = createClient().storage.from(REFERENCE_BUCKET);
  const { error } = await bucket.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[design] reference upload failed:", error.message);
    return { ok: false, error: fr.conceptionRefs.errors.upload };
  }
  const result = await recordReferenceFile({
    projectId: input.projectId,
    path,
    fileName: file.name,
    mime: file.type,
    bytes: file.size,
    sha256,
    title: input.title,
    note: input.note,
    targets: input.targets,
    type: input.type,
    usage: referenceUsageOf(input.usage),
  });
  if (!result.ok) await bucket.remove([path]);
  return result;
}
