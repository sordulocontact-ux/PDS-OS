"use client";

import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { recordSignedContract } from "@/lib/contracts/record-signed";

/**
 * A dropped contract just created (« Déposer un contrat », a deal's
 * « Importer un contrat »): its file filed as its draft, or, « Déjà signé »,
 * as its signed copy and the contract signed on that day (Sacha
 * 26/11/2026). The error to show, else null.
 */
export async function fileImportedContract({
  organizationId,
  contractId,
  file,
  signedOn,
}: {
  organizationId: string;
  contractId: string;
  file: File;
  signedOn: string | null;
}): Promise<string | null> {
  const upload = await uploadCatalogFile({
    organizationId,
    owner: { kind: "contract", id: contractId },
    category: signedOn ? "signed" : "draft",
    file,
  });
  if (!upload.ok) return upload.error;
  if (!signedOn) return null;
  const signed = await recordSignedContract({ contractId, signedOn });
  return signed.ok ? null : signed.error;
}
