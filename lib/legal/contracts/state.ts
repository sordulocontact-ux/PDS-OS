// Where an agreement stands (ticket Juridique 03: NEEDS_INFO →
// READY_TO_GENERATE → DRAFT → REVIEW_REQUIRED → APPROVED →
// READY_FOR_SIGNATURE → SIGNATURE_PENDING → SIGNED), computed by the code
// from the mapping and the contract's own status. APPROVED and
// READY_FOR_SIGNATURE are one state here: the director's approval of the
// filled document is the authorisation to send it. Client-safe.

import type { ContractState } from "@/lib/contracts/types";

export const AGREEMENT_STATES = [
  "unmapped",
  "not_needed",
  "needs_info",
  "ready_to_generate",
  "draft",
  "review_required",
  "ready_for_signature",
  "signature_pending",
  "signed",
  "ended",
] as const;
export type AgreementState = (typeof AGREEMENT_STATES)[number];

const OF_CONTRACT: Record<ContractState, AgreementState> = {
  draft: "draft",
  in_review: "review_required",
  approved: "ready_for_signature",
  sent: "signature_pending",
  signed: "signed",
  terminated: "ended",
  expired: "ended",
};

export function agreementStateOf(input: {
  mapped: boolean;
  mappingApproved: boolean;
  contract: ContractState | null;
  ready: boolean;
}): AgreementState {
  if (input.contract) return OF_CONTRACT[input.contract];
  if (!input.mapped) return input.mappingApproved ? "not_needed" : "unmapped";
  return input.ready ? "ready_to_generate" : "needs_info";
}
