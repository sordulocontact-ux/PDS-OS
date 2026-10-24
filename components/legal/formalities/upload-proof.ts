"use client";

import { fr } from "@/lib/i18n/fr";
import { openFormalityProof } from "@/lib/legal/formalities/step-actions";
import { createClient } from "@/lib/supabase/client";

/** A PDF of 20 Mo at most, like the bucket of the bulletins. */
export const isProofPdf = (file: File | null): file is File =>
  !!file &&
  (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) &&
  file.size <= 20 * 1024 * 1024;

/** Uploads a proof of a formality (JUR-03) in its folder, with the user's
 * session: the storage policy checks the folder, the SQL function that
 * records it checks the file is there. */
export async function uploadProof(
  formalityId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const slot = await openFormalityProof(formalityId);
  if (!slot.ok) return slot;
  const { error } = await createClient()
    .storage.from("formality-signatures")
    .upload(slot.path, file, { contentType: "application/pdf", upsert: false });
  if (error) {
    console.error("uploadProof:", error.message);
    return { ok: false, error: fr.legalFormalities.errors.proofFile };
  }
  return { ok: true, path: slot.path };
}
