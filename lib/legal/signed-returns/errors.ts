import { fr } from "@/lib/i18n/fr";

// The SQL refusals of a signed document deposited by a link, in French.
// Client-safe.
export function signedReturnError(message: string | undefined): string {
  const e = fr.signedReturns.errors;
  if (!message) return e.failed;
  if (message.includes("signature_link_closed")) return e.closed;
  if (message.includes("contract_not_sent")) return e.notSent;
  if (message.includes("already_deposited")) return e.already;
  if (message.includes("formality_signature_closed")) return e.signatureClosed;
  if (message.includes("not_pdf")) return e.notPdf;
  if (message.includes("upload_missing")) return e.upload;
  return e.failed;
}

/** At most 20 Mo, like the bucket of the bulletins. */
export const MAX_SIGNED_BYTES = 20 * 1024 * 1024;

/**
 * A PDF, by its first bytes (« %PDF- »), not by its name: a photo renamed
 * « .pdf » is refused with its reason. Browser-side, before the upload.
 */
export async function signedFileError(file: File): Promise<string | null> {
  const e = fr.signedReturns.errors;
  if (file.size > MAX_SIGNED_BYTES) return e.tooLarge;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const magic = String.fromCharCode(...head);
  return magic === "%PDF-" ? null : e.notPdf;
}
