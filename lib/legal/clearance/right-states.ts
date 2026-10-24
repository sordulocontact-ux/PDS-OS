// Where each right of a clearance stands (recette Juridique V1, JUR-09 and
// JUR-10): the work (authors, publisher) and the recording (producer) are
// authorised apart, and conditions accepted are not an authorisation — only
// the licence signed, with its proof, is. Computed from the holders, the
// conditions and the contracts of each right, never stored. Pure,
// client-safe.

import type { RightKind } from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";

export type RightState =
  | "to_identify"
  | "to_ask"
  | "asked"
  | "terms_proposed"
  | "terms_accepted"
  | "to_sign"
  | "authorized"
  | "refused";

const ASKED = [
  "contacted",
  "waiting_external",
  "negotiating",
  "action_required",
];

export function rightState(c: Clearance, right: RightKind): RightState {
  const contract = c.contracts.find((x) => x.right === right);
  if (
    c.status === "cleared" ||
    (contract?.state === "signed" &&
      contract.signedFile &&
      contract.evidenceFile)
  )
    return "authorized";
  if (c.status === "refused") return "refused";
  const terms = c.terms.filter((x) => x.right === right || x.right === null);
  if (terms.some((x) => x.status === "validated"))
    return contract ? "to_sign" : "terms_accepted";
  if (terms.some((x) => x.status === "proposed")) return "terms_proposed";
  if (!c.holders.some((h) => h.right === right)) return "to_identify";
  return ASKED.includes(c.status) ? "asked" : "to_ask";
}
