// The values a contract template may ask for (ticket Juridique 03, « générer
// une copie remplie avec données sourcées »), each read from one source by
// the code: the fiche de renseignements, the Réseau, the project, the
// credits, the mapping. A template writes them as {{id}}; an id outside
// this list is refused when the template is saved. Client-safe.

export const CONTRACT_FIELD_IDS = [
  "personne.nom_civil",
  "personne.nom_artiste",
  "personne.email",
  "personne.telephone",
  "personne.adresse",
  "personne.statut",
  "personne.societe",
  "personne.siret",
  "personne.ipi",
  "personne.roles",
  "projet.titre",
  "projet.artiste",
  "projet.titres",
  "remuneration",
  "organisation.nom",
  // The terms of a deal (its validated deal memo), for the long contract
  // generated from the deal (Sacha 22/11/2026, 20261122140101); one per term
  // of lib/deals/terms.ts, music, label and brand.
  "deal.songwriting_split",
  "deal.master_split",
  "deal.royalties",
  "deal.advance",
  "deal.credits",
  "deal.territories",
  "deal.duration",
  "deal.exclusivity",
  "deal.promo",
  "deal.deal_nature",
  "deal.scope",
  "deal.minimum_guarantee",
  "deal.options",
  "deal.commitments",
  "deal.conditions",
  "deal.campaign",
  "deal.deliverables",
  "deal.schedule",
  "deal.fee",
  "deal.usage_rights",
  "deal.paid_media",
  "deal.obligations",
] as const;
export type ContractFieldId = (typeof CONTRACT_FIELD_IDS)[number];

/** The fields as the template editor offers them, by what they describe. */
export const CONTRACT_FIELD_GROUPS: Record<
  "person" | "project" | "agreement" | "deal",
  readonly ContractFieldId[]
> = {
  person: [
    "personne.nom_civil",
    "personne.nom_artiste",
    "personne.adresse",
    "personne.email",
    "personne.telephone",
    "personne.statut",
    "personne.societe",
    "personne.siret",
    "personne.ipi",
  ],
  project: ["projet.titre", "projet.artiste", "projet.titres"],
  agreement: ["remuneration", "personne.roles", "organisation.nom"],
  deal: CONTRACT_FIELD_IDS.filter((id) => id.startsWith("deal.")),
};

/** A term of a deal, as a template's field (« deal.royalties »). */
export const dealFieldOf = (termKey: string) => `deal.${termKey}`;

export type FieldSource =
  | "fiche"
  | "network"
  | "project"
  | "credits"
  | "mapping"
  | "organization"
  // The terms of a deal's validated memo.
  | "deal";

// Same pattern as contract_placeholders (SQL).
const PLACEHOLDER = /\{\{\s*([a-z0-9_.]+)\s*\}\}/g;

export function placeholdersOf(body: string): string[] {
  return [...new Set([...body.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();
}

export const isContractField = (id: string): id is ContractFieldId =>
  (CONTRACT_FIELD_IDS as readonly string[]).includes(id);

export const unknownPlaceholders = (body: string) =>
  placeholdersOf(body).filter((id) => !isContractField(id));

/** « 600 € HT » from cents: the one formatter of an amount. */
export { formatAmount as formatFee } from "@/lib/utils/money";

/** Cents from what a person typed (« 600 », « 600 € », « 1 200,50 »), or
 * null when it is not a plain amount: then a human types it. */
export function feeCentsOf(text: string | null | undefined): number | null {
  if (!text) return null;
  const clean = text.replace(/[\s  ]/g, "").replace(/(€|eur|euros?)$/i, "");
  if (!/^\d+([.,]\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean.replace(",", ".")) * 100);
  return cents > 0 && cents <= 100_000_000 ? cents : null;
}

/** Where each value is kept, so a missing one says where to fill it in. */
export const FIELD_HOME = {
  ...(Object.fromEntries(
    CONTRACT_FIELD_IDS.filter((id) => id.startsWith("deal.")).map((id) => [
      id,
      "deal",
    ]),
  ) as Partial<Record<ContractFieldId, FieldSource>>),
  "personne.nom_civil": "fiche",
  "personne.nom_artiste": "fiche",
  "personne.email": "fiche",
  "personne.telephone": "fiche",
  "personne.adresse": "fiche",
  "personne.statut": "fiche",
  "personne.societe": "fiche",
  "personne.siret": "fiche",
  "personne.ipi": "fiche",
  "personne.roles": "credits",
  "projet.titre": "project",
  "projet.artiste": "project",
  "projet.titres": "credits",
  remuneration: "mapping",
  "organisation.nom": "organization",
} as Record<ContractFieldId, FieldSource>;
