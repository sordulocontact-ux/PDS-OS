// Contracts (supabase/migrations/20260929000201_file_versions_and_contracts.sql).
// Client-safe: the lists mirror the database checks; the state shown is
// computed here, never typed by anyone (CLAUDE.md rule 6).

export const CONTRACT_TYPES = [
  "artist",
  "license",
  "distribution",
  "publishing",
  "coproduction",
  "image_rights",
  "service",
  "partnership",
  "other",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

/** Stored statuses; only `advance_contract` (SQL) moves them. */
export const CONTRACT_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "sent",
  "signed",
  "terminated",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/** Shown state: a signed contract past its end date reads as expired. */
export type ContractState = ContractStatus | "expired";

export const CONTRACT_ACTIONS = [
  "submit",
  "approve",
  "request_changes",
  "send",
  // The direction signs for PDS (JUR-11).
  "countersign",
  "sign",
  "terminate",
] as const;
export type ContractAction = (typeof CONTRACT_ACTIONS)[number];

export function asContractType(value: string): ContractType {
  return (CONTRACT_TYPES as readonly string[]).includes(value)
    ? (value as ContractType)
    : "other";
}

export function asContractStatus(value: string): ContractStatus {
  return (CONTRACT_STATUSES as readonly string[]).includes(value)
    ? (value as ContractStatus)
    : "draft";
}

/** "YYYY-MM-DD" of today in Paris, the team's day. */
export function todayInParis(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function contractStateOf(
  contract: { status: ContractStatus; endsOn: string | null },
  today: string,
): ContractState {
  return contract.status === "signed" &&
    contract.endsOn !== null &&
    contract.endsOn < today
    ? "expired"
    : contract.status;
}

/** Tabs of the Contracts page: what each one gathers. */
export const CONTRACT_VIEWS = {
  preparing: ["draft"],
  review: ["in_review"],
  signature: ["approved", "sent"],
  signed: ["signed", "expired"],
  terminated: ["terminated"],
} as const satisfies Record<string, readonly ContractState[]>;
export type ContractView = keyof typeof CONTRACT_VIEWS;
export const CONTRACT_VIEW_KEYS = Object.keys(CONTRACT_VIEWS) as ContractView[];

export function asContractView(value: unknown): ContractView | null {
  return CONTRACT_VIEW_KEYS.find((view) => view === value) ?? null;
}

export function inContractView(state: ContractState, view: ContractView) {
  const states: readonly ContractState[] = CONTRACT_VIEWS[view];
  return states.includes(state);
}

/** A due date to act on: not settled yet, and today or past. */
export function isContractDue(
  contract: { status: ContractStatus; dueOn: string | null },
  today: string,
): boolean {
  return (
    contract.dueOn !== null &&
    contract.dueOn <= today &&
    !["signed", "terminated"].includes(contract.status)
  );
}

export type ContractRow = {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  state: ContractState;
  dueOn: string | null;
  due: boolean;
  endsOn: string | null;
  ownerName: string;
  projectTitle: string | null;
  artistName: string | null;
  // Names of its parties (network contacts).
  parties: string[];
  // The viewer may edit it (comfort only: the database decides).
  canEdit: boolean;
};

/** What the viewer may do on a contract, decided by the server. */
export type ContractRights = {
  edit: boolean;
  submit: boolean;
  decide: boolean;
  send: boolean;
  sign: boolean;
  terminate: boolean;
};

export type ContractParty = {
  contactId: string;
  name: string;
  kind: "person" | "organization";
  role: string | null;
  // Their address in the Réseau: where the contract is sent for signature.
  email: string | null;
};

export type ContractDetail = ContractRow & {
  organizationId: string;
  projectId: string | null;
  artistId: string | null;
  ownerPersonId: string;
  startsOn: string | null;
  signedOn: string | null;
  notes: string | null;
  reviewComment: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  partyList: ContractParty[];
  can: ContractRights;
};

/** Everything the contract form edits. */
export type ContractValues = {
  id: string;
  title: string;
  type: ContractType;
  ownerPersonId: string;
  projectId: string | null;
  artistId: string | null;
  dueOn: string | null;
  startsOn: string | null;
  endsOn: string | null;
  notes: string | null;
};

/** Choices of the contract form. */
export type ContractFormOptions = {
  // Members who may follow a contract (manage_contracts); empty when the
  // viewer may only give it to themselves.
  owners: { personId: string; name: string }[];
  projects: { id: string; title: string }[];
  artists: { id: string; name: string }[];
};
