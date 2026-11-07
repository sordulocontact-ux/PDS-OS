import { foldName } from "@/lib/assistant/fuzzy-name";

/**
 * Notions of the music business PO may explain (Sacha, 07/11/2026; audit
 * of PO § 7.4). The explanation is the model's general knowledge, never
 * PDS OS data: code only adds where the notion lives in the app and the
 * label « connaissance générale, à vérifier » (explain_notion). Written by
 * the team; `topic` is the guide topic whose page is linked.
 */
export type Notion = {
  key: string;
  name: string;
  /** Words a question may use, lower case, without accents. */
  keywords: string[];
  /** Where it lives in PDS OS, in user's French. */
  place: string;
  topic: string;
};

/** Lower case, no accent, apostrophes and signs as spaces: « d'édition » → « d edition ». */
const words = (text: string) =>
  foldName(text)
    .replace(/[^a-z0-9℗]+/g, " ")
    .trim();

export const NOTIONS: readonly Notion[] = [
  {
    key: "isrc",
    name: "ISRC",
    keywords: ["isrc", "code isrc"],
    place:
      "Dans la fiche du titre : il se renseigne en modifiant le titre et se lit dans son dossier, en Vue d'ensemble.",
    topic: "catalog",
  },
  {
    key: "iswc",
    name: "ISWC",
    keywords: ["iswc"],
    place: "Dans la fiche du titre, onglet Droits.",
    topic: "catalog",
  },
  {
    key: "upc",
    name: "UPC / EAN",
    keywords: ["upc", "ean", "code barre", "code-barres"],
    place:
      "Dans la Distribution d'un projet, l'étape Préparation le vérifie ; souvent attribué par le distributeur, il ne bloque pas.",
    topic: "release",
  },
  {
    key: "master_rights",
    name: "Droits master (℗, droits du producteur)",
    keywords: [
      "droits master",
      "droit master",
      "phonogramme",
      "producteur",
      "droits voisins",
      "p rond",
      "℗",
    ],
    place:
      "Dans la fiche du titre : titulaire et année du ℗ dans l'onglet Droits, répartition master dans l'onglet Crédits, bloc Splits.",
    topic: "catalog",
  },
  {
    key: "publishing",
    name: "Droits d'édition (droit d'auteur)",
    keywords: [
      "edition",
      "editeur",
      "droit d'auteur",
      "droits d'auteur",
      "publishing",
      "auteur compositeur",
    ],
    place:
      "Répartition édition dans la fiche du titre, onglet Crédits, bloc Splits ; les contrats d'édition dans Contrats.",
    topic: "catalog",
  },
  {
    key: "split",
    name: "Split (répartition)",
    keywords: ["split", "splits", "repartition", "parts", "pourcentages"],
    place:
      "Dans la fiche du titre, onglet Crédits, bloc Splits, en master et en édition ; le Juridique d'un projet les reprend.",
    topic: "catalog",
  },
  {
    key: "sacem",
    name: "SACEM",
    keywords: ["sacem", "bulletin", "depot d'oeuvre"],
    place:
      "Déclarations dans la fiche du titre, onglet Droits ; le bulletin de déclaration dans le Juridique d'un projet, Suivi, démarche SACEM.",
    topic: "legal",
  },
  {
    key: "producer_societies",
    name: "SCPP et SPPF",
    keywords: ["scpp", "sppf"],
    place: "Déclarations dans la fiche du titre, onglet Droits.",
    topic: "catalog",
  },
  {
    key: "performer_societies",
    name: "ADAMI et SPEDIDAM",
    keywords: ["adami", "spedidam", "artiste interprete", "interpretes"],
    place: "Déclarations dans la fiche du titre, onglet Droits.",
    topic: "catalog",
  },
  {
    key: "featuring",
    name: "Featuring",
    keywords: ["featuring", "feat", "invite"],
    place:
      "Les artistes d'un titre, featuring compris, se créditent dans sa fiche ; leurs parts dans l'onglet Crédits, bloc Splits.",
    topic: "catalog",
  },
  {
    key: "sample",
    name: "Sample (reprise d'une œuvre existante)",
    keywords: ["sample", "samples", "sampling", "interpolation", "reprise"],
    place:
      "Dans le Juridique d'un projet : une œuvre existante reprise demande une autorisation, et non autorisée elle bloque la sortie.",
    topic: "legal",
  },
  {
    key: "mix_master",
    name: "Mise à plat, mix, mastering, stems",
    keywords: [
      "mix",
      "mixage",
      "mastering",
      "mise a plat",
      "stems",
      "master final",
      "premaster",
    ],
    place:
      "Dans le workflow Master d'un projet (Source, Brief, Mixage, Mastering, Master final) ; l'état audio se lit sur le titre, dans le Catalogue.",
    topic: "master",
  },
  {
    key: "distributor",
    name: "Distributeur et agrégateur",
    keywords: [
      "distributeur",
      "agregateur",
      "distribution",
      "the orchard",
      "dsp",
      "plateformes",
    ],
    place:
      "Dans la Distribution d'un projet : PDS OS prépare et suit le dépôt, saisi à la main dans The Orchard.",
    topic: "release",
  },
  {
    key: "contracts",
    name: "Contrat d'artiste, licence, coproduction",
    keywords: [
      "contrat d'artiste",
      "licence",
      "coproduction",
      "cession",
      "contrat de distribution",
    ],
    place:
      "Dans Contrats ; ceux d'un projet se préparent depuis son Juridique, à partir des modèles validés.",
    topic: "contracts",
  },
];

/** The notions a question names (two at most, for « the difference between… »). */
export function findNotions(subject: string): Notion[] {
  const folded = ` ${words(subject)} `;
  const key = subject.trim().toLowerCase();
  const exact = NOTIONS.find((n) => n.key === key);
  if (exact) return [exact];
  return NOTIONS.map((notion) => ({
    notion,
    score: notion.keywords.filter((k) => folded.includes(` ${words(k)} `))
      .length,
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.notion);
}
