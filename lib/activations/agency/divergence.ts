// An agency status read as « further than a pending decision » : contacted,
// published, done… Decided by code from the words of the file, never fixed
// (« PO ne corrige pas silencieusement un statut »). Client-safe.

const ADVANCED =
  /(contact|publi|post|realis|interess|confirm|en ligne|live|fait|termin|diffus)/;

export function agencyStatusAdvanced(status: string | null): boolean {
  if (!status) return false;
  return ADVANCED.test(
    status
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
  );
}

/** Ahead of a decision still « À examiner », or against a refusal (ticket :
 * « afficher les deux et ouvrir une alerte, sans arbitrage automatique »). */
export function isDivergent(row: {
  absent_since?: string | null;
  agency_status: string | null;
  pds_decision: string;
}): boolean {
  return (
    !row.absent_since &&
    agencyStatusAdvanced(row.agency_status) &&
    (row.pds_decision === "to_review" || row.pds_decision === "refused")
  );
}
