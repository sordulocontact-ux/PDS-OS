import type { ClearanceStatus } from "@/lib/legal/clearance/matrix";

// The ticket's nine states, as three moments for the person (the prototype
// of 07/10/2026): ask the rights holders, negotiate their conditions, get
// the contract signed with its proof. Closed: none. Plain code, read by
// the server page and the client moments alike.
const MOMENTS = ["ask", "negotiate", "sign"] as const;
export type ClearanceMoment = (typeof MOMENTS)[number];

const MOMENT_OF: Record<ClearanceStatus, number> = {
  to_investigate: 0,
  rightsholders_identified: 0,
  contacted: 1,
  waiting_external: 1,
  negotiating: 1,
  refused: 1,
  action_required: 1,
  agreement_reached: 2,
  document_pending: 2,
  signed: 2,
  cleared: 3,
  abandoned: 3,
};

/** The open moment of a clearance, none once closed. */
export const momentOf = (status: ClearanceStatus): ClearanceMoment | null =>
  MOMENTS[MOMENT_OF[status]] ?? null;
