// The language a contract template is written in (Ibé, 18/11/2026: « il
// faudrait sélectionner la langue du contrat », for an English artist). A
// template is imported in its language by a human; a contract generated from
// it is in that language. PO never translates a clause. Client-safe.

export const CONTRACT_LANGUAGES = ["fr", "en"] as const;
export type ContractLanguage = (typeof CONTRACT_LANGUAGES)[number];

export const asContractLanguage = (value: unknown): ContractLanguage =>
  value === "en" ? "en" : "fr";
