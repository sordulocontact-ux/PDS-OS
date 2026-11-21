// « Titres et artistes » of a collective project (docs/pds-mic-plan.md,
// lot 6): where each title and each participation stands, computed from
// what the other modules already hold, never stored (§ 3.1, « Calculés par
// le code »). A module not linked to the titles yet reads as neutral. Pure:
// shared by the server and the client.

import type { ContractState } from "@/lib/contracts/types";
import type { AgreementStatus, DealStage } from "@/lib/deals/types";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { TitleParticipation } from "@/lib/projects/participation-rules";
import type { ProjectTitle } from "@/lib/projects/title-rules";

const fr = { projectTitles };

// ------------------------------------------------------------------ Master

/** A version of the title's mix or mastering in this project
 * (master_mix_versions): its round, number and the decision on it. */
export type TitleVersion = {
  stage: "mix" | "mastering";
  number: number;
  decision: "approved" | "changes_requested" | null;
};

/**
 * Where the title stands in the project's Master, in the words of the
 * workflows' common status (lib/workflow-status/rules.ts):
 * - none: no master in the Catalogue yet, so nothing for the Master;
 * - final: its master final, validated here or already in the Catalogue;
 * - round: its latest version of the round it is in, and what was decided;
 * - mixed: its Mix final validated, the mastering not started;
 * - todo: in the Catalogue, no version yet; `sourced`: its source is
 *   confirmed in the Master (master_flow_sources, the rule of the Master's
 *   « Attendent leur source »), undefined when not read (the Master's own
 *   switcher, which keeps « À mixer »).
 * Only this title's versions are read (principle 1: never two titles).
 */
export type TitleMasterState =
  | { kind: "none" }
  | { kind: "todo"; sourced?: boolean }
  | { kind: "mixed" }
  | { kind: "final"; before: boolean }
  | {
      kind: "round";
      round: "mix" | "mastering";
      number: number;
      decision: "pending" | "changes_requested";
    };

export function titleMasterState(input: {
  hasMaster: boolean;
  // The title's audio in the Catalogue is its master final (masters.
  // audio_state): it had it before the workflow, or the workflow put it.
  finalInCatalogue: boolean;
  versions: TitleVersion[];
  sourced?: boolean;
}): TitleMasterState {
  if (!input.hasMaster) return { kind: "none" };
  const latest = (stage: TitleVersion["stage"]) =>
    input.versions
      .filter((version) => version.stage === stage)
      .sort((a, b) => b.number - a.number)[0];
  const mastering = latest("mastering");
  if (
    input.versions.some(
      (v) => v.stage === "mastering" && v.decision === "approved",
    )
  )
    return { kind: "final", before: false };
  if (input.finalInCatalogue && !mastering)
    return { kind: "final", before: true };
  if (mastering)
    return {
      kind: "round",
      round: "mastering",
      number: mastering.number,
      decision:
        mastering.decision === "changes_requested"
          ? "changes_requested"
          : "pending",
    };
  if (
    input.versions.some((v) => v.stage === "mix" && v.decision === "approved")
  )
    return { kind: "mixed" };
  const mix = latest("mix");
  if (mix)
    return {
      kind: "round",
      round: "mix",
      number: mix.number,
      decision:
        mix.decision === "changes_requested" ? "changes_requested" : "pending",
    };
  return { kind: "todo", sourced: input.sourced };
}

/** The common status a title's Master state reads as (its pill's tone,
 * workflowStatusTone): a version to decide waits for someone, a retake or
 * a round under way runs, the master final is done. */
/** The words of a title's Master state (« Mix V2 à valider »); null: no
 * master yet. Shared by « Titres et artistes » and the Master's title
 * switcher (lot 8). */
export function titleMasterLabel(state: TitleMasterState): string | null {
  const t = fr.projectTitles.board.master;
  switch (state.kind) {
    case "none":
      return null;
    case "todo":
      return t.todo;
    case "mixed":
      return t.mixed;
    case "final":
      return t.final;
    case "round":
      return state.decision === "pending"
        ? t.pending(state.round, state.number)
        : t.retake(state.round, state.number);
  }
}

/**
 * What the recap's Mix cell says of a title (the Excel's « Son reçu »):
 * its Master state's words, except before its first mix, where it says
 * whether the source is there (« Son reçu », « Son attendu »: the Master's
 * own rule). No master in the Catalogue: nothing, as the Master says
 * nothing of a title it does not hold.
 */
export function titleMixFact(state: TitleMasterState): {
  label: string;
  status: NonNullable<ReturnType<typeof titleMasterStatus>>;
} | null {
  const t = fr.projectTitles.board.master;
  if (state.kind === "todo" && state.sourced !== undefined)
    return state.sourced
      ? { label: t.sourceReceived, status: "in_progress" }
      : { label: t.sourceExpected, status: "waiting" };
  const label = titleMasterLabel(state);
  const status = titleMasterStatus(state);
  return label && status ? { label, status } : null;
}

export function titleMasterStatus(
  state: TitleMasterState,
): "not_started" | "in_progress" | "waiting" | "done" | null {
  switch (state.kind) {
    case "none":
      return null;
    case "todo":
      return "not_started";
    case "mixed":
      return "in_progress";
    case "final":
      return "done";
    case "round":
      return state.decision === "pending" ? "waiting" : "in_progress";
  }
}

// ---------------------------------------------------------------- Contract

/**
 * What a contract's copies say (the table CONTRATS of Ibé's Excel): the
 * person's signed copies (contract_files, category signed: how many, and
 * whether one came by the person's link), the proof « signé autrement »
 * (category evidence), and whether PDS has countersigned (pds_signed_at).
 */
export type ContractProof = {
  signedFiles: number;
  signedViaLink: boolean;
  evidence: boolean;
  countersigned: boolean;
};

export const NO_PROOF: ContractProof = {
  signedFiles: 0,
  signedViaLink: false,
  evidence: false,
  countersigned: false,
};

/**
 * A participation's contract (title_participations.contract_id, the only
 * source, plan § 0 ter; set from the person's contract by the database once
 * the accord is validated, migration 20261121230101: the recap, the banner,
 * the locks and the deals read the same one):
 * - contract: linked and readable by the viewer, with its shown state and
 *   what its copies say;
 * - hidden: linked, but the viewer may not read contracts (RLS): said as
 *   linked, never as missing;
 * - missing: a confirmed participation without one (décision 6: shown as to
 *   do, never red);
 * - none: not expected yet (proposed, invited) or no longer (declined,
 *   withdrawn).
 * Waivers: participation_waivers (lot 12), beside it.
 */
export type ParticipationContract =
  | {
      kind: "contract";
      id: string;
      title: string;
      state: ContractState;
      proof: ContractProof;
    }
  | { kind: "hidden" }
  | { kind: "missing" }
  | { kind: "none" };

export function participationContract(input: {
  status: TitleParticipation["status"];
  contractId: string | null;
  contract: {
    id: string;
    title: string;
    state: ContractState;
    proof: ContractProof;
  } | null;
}): ParticipationContract {
  if (input.contractId)
    return input.contract
      ? { kind: "contract", ...input.contract }
      : { kind: "hidden" };
  return input.status === "confirmed" ? { kind: "missing" } : { kind: "none" };
}

// ------------------------------------------------------------- Negotiation

/** A participation's deal, as the Business module holds it (deals,
 * read under its RLS): its stage and who negotiates it. */
export type ParticipationDeal = {
  id: string;
  stage: DealStage;
  // The accord de principe proposed or validated (its pill says which).
  agreementStatus: AgreementStatus | null;
  assignee: string | null;
  // Who it is given to (« Caler le call » plans on his free slots).
  assigneeId: string | null;
  stageChangedAt: string;
  // The next action and its date, the follow-up date (lot 11: the
  // Juridique's follow-up, as the Deals page says them).
  nextAction: string | null;
  nextActionOn: string | null;
  followUpOn: string | null;
};

/** The deal shown for a participation: the live one (one at most,
 * deals_open_participation_key), else the last abandoned. */
export function participationDeal(
  deals: ParticipationDeal[],
): ParticipationDeal | null {
  return (
    deals.find((deal) => deal.stage !== "abandoned") ??
    [...deals].sort((a, b) =>
      b.stageChangedAt.localeCompare(a.stageChangedAt),
    )[0] ??
    null
  );
}

/**
 * What the viewer knows of the project's deals (can_read_deal):
 * - all: the direction (« validate ») or the project's owner reads every
 *   deal of the project, so « Pas de dossier » is true;
 * - partial: someone else who sees some of them (the assignee of a deal):
 *   a row without a visible deal is unknown (« — »);
 * - none: no deal visible, the Négociation and Responsable columns are not
 *   shown (an empty column would say « no file » where there may be one).
 */
export type DealReach = "all" | "partial" | "none";

export function dealReach(input: {
  readsAll: boolean;
  visibleDeals: number;
}): DealReach {
  if (input.readsAll) return "all";
  return input.visibleDeals > 0 ? "partial" : "none";
}

// ------------------------------------------------------------------ Waivers

export const WAIVER_SCOPES = ["shoot", "release"] as const;
export type WaiverScope = (typeof WAIVER_SCOPES)[number];

/**
 * A waiver of the direction to shoot or release without the participation's
 * contract signed (lot 12, participation_waivers): append-only, revoked
 * without anything overwritten; past its due date it no longer covers.
 */
export type ParticipationWaiver = {
  id: string;
  scope: WaiverScope;
  reason: string;
  risk: string | null;
  dueOn: string;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
};

/** Open: not revoked, its due date not passed (Paris day). */
export const isOpenWaiver = (waiver: ParticipationWaiver, today: string) =>
  waiver.revokedAt === null && waiver.dueOn >= today;

/** Where a waiver stands, for its line: open, lapsed, revoked. */
export function waiverState(
  waiver: ParticipationWaiver,
  today: string,
): "open" | "lapsed" | "revoked" {
  if (waiver.revokedAt !== null) return "revoked";
  return waiver.dueOn >= today ? "open" : "lapsed";
}

/** The contract is signed for the locks (contracts.status = 'signed'; an
 * expired signed contract stays signed, décision 6). Unknown to a viewer
 * who may not read it: never said missing. */
export const contractSigned = (contract: ParticipationContract) =>
  contract.kind === "contract" &&
  (contract.state === "signed" || contract.state === "expired");

/**
 * What lot 12 checks of a participation: confirmed, on a title not
 * abandoned, its contract not signed (and readable). `covered`: for each
 * scope, an open waiver. Null: nothing to check (not confirmed, title
 * abandoned, contract signed or unreadable).
 */
export function contractGap(
  title: { status: string },
  participation: Pick<BoardParticipation, "status" | "contract" | "waivers">,
  today: string,
): { shoot: boolean; release: boolean } | null {
  if (title.status === "abandoned" || participation.status !== "confirmed")
    return null;
  if (participation.contract.kind === "hidden") return null;
  if (contractSigned(participation.contract)) return null;
  const covered = (scope: WaiverScope) =>
    participation.waivers.some(
      (w) => w.scope === scope && isOpenWaiver(w, today),
    );
  return { shoot: covered("shoot"), release: covered("release") };
}

// ------------------------------------------------------------------- Board

export type BoardParticipation = TitleParticipation & {
  contract: ParticipationContract;
  // Null: no deal the viewer sees.
  deal: ParticipationDeal | null;
  // Lot 12: its waivers, newest first (revoked and lapsed ones kept).
  waivers: ParticipationWaiver[];
};

export type BoardTitle = Omit<ProjectTitle, "participations"> & {
  participations: BoardParticipation[];
  masterState: TitleMasterState;
};

export type TitleBoard = {
  titles: BoardTitle[];
  dealReach: DealReach;
};

/** How many titles in each status, for the head's facts (« 3 en cours,
 * 1 prévu »). */
export function titleCounts(titles: Array<Pick<ProjectTitle, "status">>) {
  return {
    active: titles.filter((title) => title.status === "active").length,
    planned: titles.filter((title) => title.status === "planned").length,
    abandoned: titles.filter((title) => title.status === "abandoned").length,
  };
}
