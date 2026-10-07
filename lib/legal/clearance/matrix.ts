// The path of a clearance and its action matrix (ticket Juridique 05):
// which state comes next, what an exchange suggests, how a missing proof is
// said. The state itself is moved by advance_clearance (SQL), which checks
// what each state needs. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";

export const CLEARANCE_PATH = [
  "to_investigate",
  "rightsholders_identified",
  "contacted",
  "waiting_external",
  "negotiating",
  "agreement_reached",
  "document_pending",
  "signed",
  "cleared",
] as const;
export const CLEARANCE_EXCEPTIONS = [
  "refused",
  "abandoned",
  "action_required",
] as const;
export type ClearanceStatus =
  (typeof CLEARANCE_PATH)[number] | (typeof CLEARANCE_EXCEPTIONS)[number];

export const RIGHT_KINDS = ["work", "master"] as const;
export type RightKind = (typeof RIGHT_KINDS)[number];
export const SCOPES = ["work", "master", "both", "none"] as const;
export type Scope = (typeof SCOPES)[number];
export const HOLDER_ROLES = [
  "publisher",
  "author",
  "composer",
  "producer",
  "label",
  "other",
] as const;
export const EXCHANGE_KINDS = ["message", "email", "call", "note"] as const;
export const DIRECTIONS = ["out", "in", "internal"] as const;
export type HolderRole = (typeof HOLDER_ROLES)[number];
export type ExchangeKind = (typeof EXCHANGE_KINDS)[number];
export type Direction = (typeof DIRECTIONS)[number];

export const rightsOf = (scope: Scope | null): RightKind[] =>
  scope === "both"
    ? ["work", "master"]
    : scope === "work" || scope === "master"
      ? [scope]
      : [];

export const isClosed = (status: ClearanceStatus) =>
  status === "cleared" || status === "abandoned";

const onPath = (
  status: string | null,
): status is (typeof CLEARANCE_PATH)[number] =>
  CLEARANCE_PATH.includes(status as (typeof CLEARANCE_PATH)[number]);

/**
 * The next state of the path; nothing to secure goes straight to CLEARED.
 * A refusal or an action required is not an end (the rights holder comes
 * back, the action is done): the clearance resumes at the state it held
 * before (`before`, read in its journal), or from the start.
 */
export function nextStatus(
  status: ClearanceStatus,
  scope: Scope | null,
  before: string | null = null,
): ClearanceStatus | null {
  if (isClosed(status)) return null;
  if (scope === "none") return "cleared";
  if (status === "refused" || status === "action_required")
    return onPath(before) ? before : "to_investigate";
  const i = CLEARANCE_PATH.indexOf(status as (typeof CLEARANCE_PATH)[number]);
  return i >= 0 && i < CLEARANCE_PATH.length - 1 ? CLEARANCE_PATH[i + 1] : null;
}

// What an exchange suggests (« Matrice d'actions »): the code turns the
// kind of event PO read into the state to propose; only forward.
const EVENT_STATUS: Record<string, ClearanceStatus | null> = {
  new_contact: null,
  call_planned: "waiting_external",
  conditions_received: "negotiating",
  counter_proposal: "negotiating",
  agreement: "agreement_reached",
  contract_received: "document_pending",
  refusal: "refused",
  other: null,
};

export function statusFromEvent(
  event: string,
  current: ClearanceStatus,
): ClearanceStatus | null {
  const target = EVENT_STATUS[event] ?? null;
  if (!target || target === current || isClosed(current)) return null;
  if (target === "refused") return target;
  const from = CLEARANCE_PATH.indexOf(
    current as (typeof CLEARANCE_PATH)[number],
  );
  const to = CLEARANCE_PATH.indexOf(target as (typeof CLEARANCE_PATH)[number]);
  return to > from ? target : null;
}

/** A code of clearance_missing (SQL) in words. */
export function missingLabel(code: string): string {
  const t = fr.legalClearance.missing;
  const [what, right] = code.split(":");
  const r = right ? (fr.legalClearance.rights[right] ?? right) : "";
  switch (what) {
    case "qualification":
      return t.qualification;
    case "scope_none":
      return t.scope_none;
    case "rightsholder":
      return t.rightsholder(r);
    case "contacted":
      return t.contacted;
    case "terms_validated":
      return t.terms_validated;
    case "contract":
      return t.contract(r);
    case "signed":
      return t.signed(r);
    case "evidence":
      return t.evidence(r);
    default:
      return code;
  }
}
