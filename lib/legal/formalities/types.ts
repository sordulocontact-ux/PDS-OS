// What the SACEM page shows of each title's formality (ticket Juridique 06).
// Client-safe.

import type { FormalityStatus } from "@/lib/legal/formalities/definition";
import type { Prefill, SplitShare } from "@/lib/legal/formalities/prefill";

export type FormalityView = {
  id: string;
  status: FormalityStatus;
  reopened: string[];
  partialReason: string | null;
  submissionProof: string | null;
  submittedAt: string | null;
  completionProof: string | null;
  completedAt: string | null;
  externalId: string | null;
  // JUR-03: the proofs as files, « Voir la preuve » (one hour).
  submissionFileUrl: string | null;
  completionFileUrl: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  values: Record<
    string,
    { value: unknown; source: string; status: "validated" | "to_verify" }
  >;
  missing: string[];
  documents: Array<{ version: number; at: string }>;
  signatures: Array<{
    id: string;
    signer: string;
    role: string;
    status: "pending" | "signed";
    proof: string | null;
    at: string | null;
    // How it was signed (20261020070101): by the person's private link,
    // or « A signé autrement » with its day.
    via: "link" | "other" | "house" | null;
    signedOn: string | null;
    // The signer has an active private page on the project: they sign there.
    onLink: boolean;
    // Named from the Réseau: their link card sits under the bulletin.
    contactId: string | null;
    // The bulletin they deposited signed, « Voir le PDF » (one hour).
    fileUrl: string | null;
    // PDS Éditions' line: signed by the direction in PDS OS (JUR-03).
    house: boolean;
    // The bulletin changed after it: kept, never valid (JUR-03).
    superseded: boolean;
  }>;
  // The versions a newer one replaced, with the signatures that no longer
  // hold (JUR-03), newest first.
  replaced: Array<{
    version: number;
    at: string | null;
    signers: Array<{ signer: string; signed: boolean }>;
  }>;
  // The viewer may sign PDS Éditions' line: the direction (validate).
  canSignHouse: boolean;
  history: Array<{
    id: string;
    kind: string;
    note: string | null;
    at: string;
    by: string;
  }>;
};

export type TitleFormality = {
  masterId: string;
  title: string;
  prefill: Prefill;
  // The title's confirmed split: a creator or publisher added by hand takes
  // their Phono share from it.
  splitShares: SplitShare[] | null;
  borrowings: Array<{ work: string; status: string }>;
  formality: FormalityView | null;
};
