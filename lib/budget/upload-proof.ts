import type { BudgetTarget } from "@/lib/budget/types";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";

/**
 * Browser-side: keeps a spend's proof in the library of what the spend
 * belongs to, never a second storage: a project's Files (category Autres,
 * MKT-S1-15) or the artist's receipts (category « receipt », read by the
 * budget's readers only, BUD 1). Returns the file's id for the line.
 */
export function uploadBudgetProof(input: {
  organizationId: string;
  target: BudgetTarget & { kind: "project" | "artist" };
  description: string;
  file: File;
}) {
  return uploadCatalogFile({
    organizationId: input.organizationId,
    owner: input.target,
    category: input.target.kind === "project" ? "other" : "receipt",
    description: input.description,
    file: input.file,
  });
}
