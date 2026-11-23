// What the clearances page and its drawer show (ticket Juridique 05).
// Client-safe.

import type { ContractState } from "@/lib/contracts/types";
import type {
  ClearanceStatus,
  RightKind,
  Scope,
} from "@/lib/legal/clearance/matrix";

export type Clearance = {
  id: string;
  work: string;
  author: string | null;
  element: string;
  title: string | null;
  status: ClearanceStatus;
  usage: string | null;
  scope: Scope | null;
  reason: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  next: ClearanceStatus | null;
  // Codes of clearance_missing for the next state (empty: it can move).
  missing: string[];
  holders: Array<{
    id: string;
    right: RightKind;
    name: string;
    role: string;
    // Their contact in the Réseau and its address: whom the request is
    // e-mailed to.
    contactId: string | null;
    email: string | null;
    // A person or a structure of the Réseau; null for a name only.
    kind: "person" | "organization" | null;
  }>;
  exchanges: Array<{
    id: string;
    kind: string;
    direction: string;
    body: string;
    at: string;
    by: string;
    // The sender of an e-mail filed from PO's mailbox (cron), else null.
    from: string | null;
  }>;
  terms: Array<{
    id: string;
    right: RightKind | null;
    amountCents: number | null;
    share: string | null;
    credits: string | null;
    territory: string | null;
    duration: string | null;
    other: string | null;
    status: "proposed" | "validated" | "rejected";
  }>;
  contracts: Array<{
    right: RightKind;
    id: string;
    title: string;
    state: ContractState;
    signedFile: boolean;
    evidenceFile: boolean;
    // What it is e-mailed as from « Signer »; null: no text yet.
    document: { fileName: string; kind: "generated" | "file" } | null;
    // Its signed copies and proofs, to open; `byEmail`: sent back by e-mail
    // and kept by the cron, to check.
    proof: Array<{
      id: string;
      category: "signed" | "evidence";
      name: string;
      url: string | null;
      byEmail: boolean;
    }>;
    // Who follows it: only they submit it and send it (VISION-UX rule 9).
    ownerName: string | null;
    ownerIsViewer: boolean;
  }>;
};

export type Clearances = {
  items: Clearance[];
  // For the drawer: who may answer for one, which contracts may carry a right.
  people: Array<{ personId: string; name: string }>;
  projectContracts: Array<{ id: string; title: string }>;
  canValidate: boolean;
  // Where the signed copy and its proof are uploaded from the drawer
  // (contract-files/<organisation>/…).
  organizationId: string | null;
  // PDS OS sends e-mails itself (SMTP set): the request leaves from here.
  emailEnabled: boolean;
};
