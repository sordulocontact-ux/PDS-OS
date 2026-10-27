import { fileExtension } from "@/lib/catalog/file-rules";
import { MAX_PROOF_BYTES, PROOF_BUCKET } from "@/lib/distribution/proof-rules";
import type { DistributionResult } from "@/lib/distribution/result";
import { declareDistribution } from "@/lib/distribution/tracking-actions";
import type { DeclarationKind } from "@/lib/distribution/tracking";
import { distribution } from "@/lib/i18n/fr/distribution";
import { createClient } from "@/lib/supabase/client";

const fr = { distribution };

/**
 * Browser-side: uploads the proof to the private bucket (storage RLS: the
 * project's owner), then records the declaration with its path; the object
 * is removed if the declaration is refused. Without a file, declares only.
 */
export async function declareWithProof(input: {
  organizationId: string;
  projectId: string;
  kind: DeclarationKind;
  declaredOn: string;
  orchardId: string;
  note: string;
  proofUrl: string;
  file: File | null;
}): Promise<DistributionResult> {
  const t = fr.distribution.tracking.errors;
  const base = {
    projectId: input.projectId,
    kind: input.kind,
    declaredOn: input.declaredOn,
    orchardId: input.orchardId,
    note: input.note,
    proofUrl: input.proofUrl,
  };
  if (!input.file)
    return declareDistribution({ ...base, proofPath: "", proofName: "" });
  if (input.file.size === 0) return { ok: false, error: t.invalid };
  if (input.file.size > MAX_PROOF_BYTES)
    return { ok: false, error: t.fileTooLarge };

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const bucket = createClient().storage.from(PROOF_BUCKET);
  const { error } = await bucket.upload(path, input.file, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    console.error("[distribution] proof upload failed:", error.message);
    return { ok: false, error: t.uploadFailed };
  }
  const result = await declareDistribution({
    ...base,
    proofPath: path,
    proofName: input.file.name,
  });
  if (!result.ok) await bucket.remove([path]);
  return result;
}

/** Browser-side: one proof file put in the private bucket (storage RLS: the
 * project's owner), its path and name returned for the declaration(s) that
 * cite it; `removeProof` takes it back when the declaration is refused. */
export async function uploadProof(input: {
  organizationId: string;
  projectId: string;
  file: File;
}): Promise<{ path: string; name: string } | { error: string }> {
  const t = fr.distribution.tracking.errors;
  if (input.file.size === 0) return { error: t.invalid };
  if (input.file.size > MAX_PROOF_BYTES) return { error: t.fileTooLarge };
  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const { error } = await createClient()
    .storage.from(PROOF_BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    console.error("[distribution] proof upload failed:", error.message);
    return { error: t.uploadFailed };
  }
  return { path, name: input.file.name };
}

export async function removeProof(path: string): Promise<void> {
  await createClient().storage.from(PROOF_BUCKET).remove([path]);
}
