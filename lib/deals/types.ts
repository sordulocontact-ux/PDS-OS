// The Deal of the Business module (BIZ 2, docs/ARCHITECTURE.md « Business »):
// a negotiation file, not a project. Client-safe: the words of the stages
// are in lib/i18n/fr/deals.ts; who may do what is decided by the database.

/** The stages, in their order; « abandoned » beside them. */
export const DEAL_STAGES = [
  "to_contact",
  "call_planned",
  "negotiation",
  "agreement",
  "contracting",
  "signed",
  "abandoned",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

/** The stages whose call of negotiation is still to hold (Ibé 18/11/2026:
 * the call before any contract). */
export const NEGOTIATION_CALL_STAGES = [
  "to_contact",
  "call_planned",
  "negotiation",
] as const satisfies readonly DealStage[];

/** The stages a deal moves between by « Passer à l'étape » (set_deal_stage). */
export const MOVABLE_DEAL_STAGES = [
  "to_contact",
  "call_planned",
  "negotiation",
  "agreement",
  "contracting",
  "signed",
] as const satisfies readonly DealStage[];
export type MovableDealStage = (typeof MOVABLE_DEAL_STAGES)[number];

export function isDealStage(value: unknown): value is DealStage {
  return (
    typeof value === "string" &&
    (DEAL_STAGES as readonly string[]).includes(value)
  );
}

export const isClosedStage = (stage: DealStage) =>
  stage === "signed" || stage === "abandoned";

/** The kinds of deal (never « influence »: the word is the influence PDS
 * buys, lib/activations). A label or brand deal names the organization PDS
 * negotiates with (its counterpart, Ibé 18/11/2026). */
export const DEAL_KINDS = ["music", "label", "brand_partnership"] as const;
export type DealKind = (typeof DEAL_KINDS)[number];

/** Whether a kind is negotiated with an organization of the Réseau. */
export const hasCounterpart = (kind: DealKind) => kind !== "music";

export type AgreementStatus = "pending" | "validated";

/** A deal as its pages read it, with what the reader may do on it. */
export type Deal = {
  id: string;
  kind: DealKind;
  stage: DealStage;
  agreementStatus: AgreementStatus | null;
  participationId: string | null;
  projectId: string | null;
  // The project's name even when the reader does not see the project (the
  // business manager); a link only when he does.
  projectTitle: string | null;
  projectVisible: boolean;
  artistId: string | null;
  artistName: string | null;
  // The organization of the Réseau a label or brand deal is negotiated with.
  counterpartId: string | null;
  counterpartName: string | null;
  // The participation's title: its name, else « Titre n ».
  titleLabel: string | null;
  titlePosition: number | null;
  participationStatus: string | null;
  // The participation's contract status, never copied on the deal.
  contractStatus: string | null;
  assignee: { id: string; name: string } | null;
  nextAction: string | null;
  nextActionOn: string | null;
  followUpOn: string | null;
  abandonReason: string | null;
  stageChangedAt: string;
  createdAt: string;
  // The reader's gestures (the database decides again on each write).
  canWrite: boolean;
  canAssign: boolean;
  canDecide: boolean;
  // « Caler le call »: the project's owner, who reads the deal without
  // writing it, plans the call of a music deal before its accord
  // (can_plan_negotiation_call, 20261120140101).
  canPlanCall: boolean;
};

/** A line of a deal's journal. */
export type DealEvent = {
  id: string;
  kind:
    | "created"
    | "assigned"
    | "stage"
    | "agreement_validated"
    | "agreement_refused"
    | "abandoned"
    | "next_action"
    | "term"
    // BIZ 7: a deal memo made or validated, a contract linked, a term of the
    // memo checked against the contract.
    | "memo"
    | "memo_validated"
    | "contract_linked"
    | "contract_check"
    // A deal memo by e-mail (20261120150101).
    | "memo_received"
    | "memo_submitted"
    | "memo_changes_requested"
    | "memo_sent"
    | "memo_loop";
  fromStage: DealStage | null;
  toStage: DealStage | null;
  reason: string | null;
  detail: Record<string, unknown>;
  // « assigned »: who the deal was given to, by name (null: taken back).
  assignee: string | null;
  actor: string | null;
  createdAt: string;
};

/** A member a deal may be given to. */
export type DealNegotiator = { id: string; name: string; role: string };
