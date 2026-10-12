// What is a legal prerequisite rather than a marketing lever (MKT-S1-07):
// contracts, rights, clearances, declarations. They belong to the Juridique
// and appear in the Stratégie as dependencies, never as levers. Decided by
// code from the words of the label, client-safe.

const LEGAL =
  /\b(contrats?\b|juridique|droits?\b|cession|licen[cs]e|clearance|autorisation|sacem|scpp|sppf|adami|spedidam|declaration sacem|avocat|accord de|splits?\b|repartition)/;

const fold = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** The word that makes a label a legal prerequisite, or null. */
export function legalWordOf(label: string): string | null {
  return LEGAL.exec(fold(label))?.[1] ?? null;
}

export const isLegalItem = (label: string) => legalWordOf(label) !== null;
