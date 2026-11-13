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
 * - todo: in the Catalogue, no version yet.
 * Only this title's versions are read (principle 1: never two titles).
 */
export type TitleMasterState =
  | { kind: "none" }
  | { kind: "todo" }
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
  return { kind: "todo" };
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
 * A participation's contract (title_participations.contract_id, the only
 * source, plan § 0 ter):
 * - contract: linked and readable by the viewer, with its shown state;
 * - hidden: linked, but the viewer may not read contracts (RLS): said as
 *   linked, never as missing;
 * - missing: a confirmed participation without one (décision 6: shown as to
 *   do, never red);
 * - none: not expected yet (proposed, invited) or no longer (declined,
 *   withdrawn).
 * Waivers come with lot 12.
 */
export type ParticipationContract =
  | { kind: "contract"; id: string; title: string; state: ContractState }
  | { kind: "hidden" }
  | { kind: "missing" }
  | { kind: "none" };

export function participationContract(input: {
  status: TitleParticipation["status"];
  contractId: string | null;
  contract: { id: string; title: string; state: ContractState } | null;
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
  stageChangedAt: string;
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

// ------------------------------------------------------------------- Board

export type BoardParticipation = TitleParticipation & {
  contract: ParticipationContract;
  // Null: no deal the viewer sees.
  deal: ParticipationDeal | null;
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
