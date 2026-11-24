// The contract of a deal's participation, as the Juridique of its project
// knows it, shown in the deal's « Maintenant » while contracting (Sacha
// 24/11/2026: « pourquoi Lina ne peut pas faire le contrat depuis ici ? »).
// Its state and its gestures are the Juridique's own. Client-safe.

import type { AgreementState } from "@/lib/legal/contracts/state";

export type ParticipationStep = {
  projectId: string;
  projectTitle: string;
  // The project's owner: who prepares the contract.
  ownerName: string | null;
  // The person of the participation.
  person: string;
  // Their line in the Juridique, null when it has none yet.
  key: string | null;
  needId: string | null;
  state: AgreementState | null;
  // The template PDS OS proposes (or the one chosen), and the fee.
  template: string | null;
  feeCents: number | null;
  // What their fiche de renseignements still lacks.
  missing: string[];
  // A guest artist's accord awaited (§ 3.5): the titles.
  awaiting: string[] | null;
  noAgreementReason: string | null;
  // The reader prepares it (the project's owner, manage_legal): the
  // database decides again.
  canAct: boolean;
  hrefs: { demarche: string | null; fiche: string | null; plan: string };
};
