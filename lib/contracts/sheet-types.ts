// What the side sheet of a contract shows beyond its row (§ 6.7 bis, the
// Réseau's model, Sacha 24/11/2026), read when it opens
// (loadContractSheet). Every state, date and count is computed by the code.
// Client-safe.

import type { PreviewFile } from "@/lib/catalog/file-type";
import type { SheetInvoice } from "@/lib/invoices/sheet-types";
import type { SheetLink } from "@/lib/ui/record-sheet";

export type ContractSheetData = {
  // « Maintenant »: what it asks of the viewer or who it waits for
  // (contractNowTitle), and its last step said in one line.
  now: { title: string; mine: boolean; late: boolean };
  caption: string | null;
  // Its document to read (the generated one, else its latest draft).
  pdf: string | null;
  // Who signs for the other party: where « E-mail » writes.
  signerEmail: string | null;
  parties: {
    contactId: string;
    name: string;
    role: string | null;
    signer: boolean;
  }[];
  // Its files, folded in the summary card, each opening its preview.
  files: PreviewFile[];
  project: SheetLink | null;
  artist: SheetLink | null;
  deals: SheetLink[];
  // Where it comes from in the Juridique (JUR-17).
  origin: SheetLink | null;
  startsOn: string | null;
  signedOn: string | null;
  notes: string | null;
  invoices: SheetInvoice[];
};
