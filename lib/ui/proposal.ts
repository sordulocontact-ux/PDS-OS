/**
 * A proposal to decide one by one (docs/VISION-UX.md rules 11, 12 and 21):
 * what PO heard in an exchange, or what the code read in a source, waiting
 * for a person. Each module keeps its own table and maps its rows to this
 * shape for `ProposalRow` (components/ui/proposal-row.tsx). Nothing is
 * kept in advance: every proposal starts « proposed ».
 */
export type ProposalState = "proposed" | "kept" | "discarded";

export type Proposal = {
  id: string;
  // The words as they stand now (reworded by a person once edited).
  text: string;
  // PO's words when a person reworded them: « Proposé : … » while editing.
  original?: string | null;
  // Small line above the text: « Influence », « Pour : Studio Ressac ».
  context?: string | null;
  // The exact sentence it was taken from, and where it was said.
  quote?: string | null;
  // « Échange stratégique du 05/10 », « Brief de cadrage › Besoins ».
  from?: string | null;
  // Where `from` opens (the call, the document), when it has a page.
  href?: string | null;
  state: ProposalState;
  // Who confirmed or set it aside.
  decidedBy?: string | null;
  // Who reworded it: « Modifié par … ».
  editedBy?: string | null;
};

/** Proposals still waiting for a person, for « n à confirmer ». */
export const proposalsToConfirm = (proposals: Pick<Proposal, "state">[]) =>
  proposals.filter((p) => p.state === "proposed").length;
