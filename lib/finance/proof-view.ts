// The box of proofs as the page shows it (Finance › Justificatifs, lot 6):
// each proof with its computed state, the spends the code proposes for it,
// the spend it is attached to. Built on the server from the proofs and the
// spends, so the browser gets a few rows, not every spend. Client-safe.

import {
  proofMatches,
  spendsWithoutProof,
  type ProofReason,
} from "@/lib/finance/proof-match";
import {
  proofOpen,
  proofState,
  type FinanceProof,
  type ProofState,
} from "@/lib/finance/proofs";
import { spendDay, spendTtc, type FinanceSpend } from "@/lib/finance/spends";

/** A spend, as a proof names it. */
export type SpendRef = {
  id: string;
  label: string;
  // TTC.
  cents: number;
  day: string;
  envelope: string;
};

export type ProofRow = {
  proof: FinanceProof;
  state: ProofState;
  matches: { spend: SpendRef; reasons: ProofReason[] }[];
  attached: SpendRef | null;
};

export const PROOF_VIEWS = ["a-traiter", "rattaches", "tous"] as const;
export type ProofView = (typeof PROOF_VIEWS)[number];
export const asProofView = (value: unknown): ProofView =>
  PROOF_VIEWS.find((v) => v === value) ?? "a-traiter";

export const inProofView = (row: ProofRow, view: ProofView) =>
  view === "tous" ||
  (view === "a-traiter" ? proofOpen(row.proof) : row.state === "attached");

export function proofRows(
  proofs: FinanceProof[],
  spends: FinanceSpend[],
  envelopeOf: (spend: FinanceSpend) => string,
): { rows: ProofRow[]; choices: SpendRef[] } {
  const ref = (spend: FinanceSpend): SpendRef => ({
    id: spend.id,
    label: spend.label,
    cents: spendTtc(spend),
    day: spendDay(spend),
    envelope: envelopeOf(spend),
  });
  const open = spendsWithoutProof(spends);
  const byId = new Map(spends.map((s) => [s.id, s]));
  const rows = proofs.map((proof): ProofRow => {
    const matches = proofOpen(proof)
      ? proofMatches(proof, open).map((m) => ({
          spend: ref(m.spend),
          reasons: m.reasons,
        }))
      : [];
    const line = proof.lineId ? byId.get(proof.lineId) : undefined;
    return {
      proof,
      state: proofState(proof, matches.length > 0),
      matches,
      attached: line ? ref(line) : null,
    };
  });
  return { rows, choices: open.map(ref) };
}
