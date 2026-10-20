// The clauses a contract's revision names (proto « Projet complet »:
// « Modifier une clause »), as revise_contract_clause accepts them.
// Client-safe.

export const CLAUSES = [
  "credit",
  "duration",
  "territory",
  "fee",
  "exclusivity",
  "other",
] as const;
export type Clause = (typeof CLAUSES)[number];
