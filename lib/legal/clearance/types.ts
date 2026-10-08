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
  holders: Array<{ id: string; right: RightKind; name: string; role: string }>;
  exchanges: Array<{
    id: string;
    kind: string;
    direction: string;
    body: string;
    at: string;
    by: string;
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
  }>;
  history: Array<{
    id: string;
    kind: string;
    from: string | null;
    to: string | null;
    note: string | null;
    at: string;
    by: string;
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
};
