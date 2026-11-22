import type { ContractRights, ContractState } from "@/lib/contracts/types";

// « Maintenant » of a contract (proto « Contrats », 29/10/2026): what it asks
// of the viewer, or who it waits for — computed from its state, its rights
// (decided by the server) and what came back signed. Client-safe, pure.

export type ContractNowKind =
  // The viewer acts.
  | "deposit"
  | "decide"
  | "submit"
  | "send"
  | "countersign"
  | "mark_signed"
  // Someone else does.
  | "await_decide"
  | "await_submit"
  | "await_send"
  | "await_signer"
  | "await_countersign"
  | "await_mark_signed"
  // Nothing left.
  | "signed"
  | "expired"
  | "terminated";

export type ContractNowInput = {
  state: ContractState;
  can: ContractRights;
  // The viewer signs for PDS (permission validate).
  canCountersign: boolean;
  // Generated from a template: signed by both parties, then checked (JUR-11).
  generated: boolean;
  // The signed copy is back (by the person's link, or dropped by the team).
  returned: boolean;
  countersigned: boolean;
  // It has a document: generated, or a PDF filed (draft or signed).
  documented: boolean;
};

export function contractNowOf(c: ContractNowInput): ContractNowKind {
  switch (c.state) {
    // Nothing to send to validate before its PDF is filed (Sacha 22/11/2026).
    case "draft":
      if (!c.documented) return c.can.submit ? "deposit" : "await_submit";
      return c.can.submit ? "submit" : "await_submit";
    case "in_review":
      return c.can.decide ? "decide" : "await_decide";
    case "approved":
      return c.can.send ? "send" : "await_send";
    case "sent":
      if (!c.returned) return "await_signer";
      if (c.generated && !c.countersigned)
        return c.canCountersign ? "countersign" : "await_countersign";
      return c.can.sign ? "mark_signed" : "await_mark_signed";
    default:
      return c.state;
  }
}

/** The kinds the viewer acts on (« À vous »). */
export const isMine = (kind: ContractNowKind) =>
  [
    "deposit",
    "decide",
    "submit",
    "send",
    "countersign",
    "mark_signed",
  ].includes(kind);
