// What the SACEM page shows of each title's formality (ticket Juridique 06).
// Client-safe.

import type { FormalityStatus } from "@/lib/legal/formalities/definition";
import type { Prefill } from "@/lib/legal/formalities/prefill";

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
  }>;
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
  borrowings: Array<{ work: string; status: string }>;
  formality: FormalityView | null;
};
