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

/** Ready for several kinds; only « music » is created in V1 (never
 * « influence »: the word is the influence PDS buys, lib/activations). */
export const DEAL_KINDS = ["music", "brand_partnership", "label"] as const;
export type DealKind = (typeof DEAL_KINDS)[number];
export const CREATABLE_DEAL_KINDS = [
  "music",
] as const satisfies readonly DealKind[];

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
    | "contract_check";
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
