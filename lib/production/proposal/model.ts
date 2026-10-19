// The director's proposal in versions (PR-11, proto BODY.creative): what a
// version is, which one is retained, what each side still has to decide.
// Pure and client-safe; read from production_direction_versions, never
// guessed.

export type ProposalSide = "pending" | "approved" | "changes";
export type ProposalExt = ProposalSide | "none";

export type ProposalVersion = {
  id: string;
  number: number;
  treatmentUrl: string;
  moodboardUrl: string | null;
  cuttingUrl: string;
  note: string | null;
  depositedBy: string;
  depositedAt: string;
  int: ProposalSide;
  intBy: string | null;
  intComment: string | null;
  ext: ProposalExt;
  extBy: string | null;
  extComment: string | null;
};

const SIDE: readonly ProposalSide[] = ["pending", "approved", "changes"];
export const sideOf = (v: string): ProposalSide =>
  SIDE.find((s) => s === v) ?? "pending";
export const extOf = (v: string): ProposalExt =>
  v === "none" ? "none" : sideOf(v);

/** Validated inside and, when asked, outside. */
export const isValidated = (v: Pick<ProposalVersion, "int" | "ext">) =>
  v.int === "approved" && (v.ext === "approved" || v.ext === "none");

/** Sent back by one side. */
export const isSentBack = (v: Pick<ProposalVersion, "int" | "ext">) =>
  v.int === "changes" || v.ext === "changes";

/** Newest first: the retained one is the newest validated. */
export function retainedOf<T extends Pick<ProposalVersion, "int" | "ext">>(
  versions: T[],
): T | null {
  return versions.find(isValidated) ?? null;
}

export type ProposalState = {
  latest: ProposalVersion | null;
  retained: ProposalVersion | null;
  // A new version is expected from the director.
  depositOpen: boolean;
  // The latest version waits for the internal or the external decision.
  waitsInt: boolean;
  waitsExt: boolean;
  // Retained, but a newer version is on its way or asked: « À revoir ».
  rework: boolean;
};

export function proposalState(
  versions: ProposalVersion[],
  revisionAsked: boolean,
): ProposalState {
  const latest = versions[0] ?? null;
  const retained = retainedOf(versions);
  const depositOpen =
    !latest ||
    isSentBack(latest) ||
    (retained?.id === latest.id && revisionAsked);
  return {
    latest,
    retained,
    depositOpen,
    waitsInt: Boolean(
      latest && !isSentBack(latest) && latest.int === "pending",
    ),
    waitsExt: Boolean(
      latest && !isSentBack(latest) && latest.ext === "pending",
    ),
    rework: Boolean(retained && (retained.id !== latest?.id || revisionAsked)),
  };
}
