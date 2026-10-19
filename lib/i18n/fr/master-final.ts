// The Master final step (proto `master-v2.html`, `master:final`): the file
// at the Catalogue, where it comes from, what it unlocks, the other
// deliverables.

const duration = (s: number) =>
  `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`;

export const masterFinal = {
  card: (file: string) => `Master final · ${file}`,
  validated: (n: number, by: string | null, day: string) =>
    `Master V${n} validé${by ? ` par ${by}` : ""} le ${day}`,
  before: (day: string) =>
    `Déjà au Catalogue avant le workflow, ajouté le ${day}`,
  atCatalogue: "Au Catalogue",
  notYet: "Pas encore",
  catalogue: "État au Catalogue",
  catalogueValue: (title: string, isrc: string | null) =>
    [`« ${title} »`, "Master final", isrc ? `ISRC ${isrc}` : null]
      .filter(Boolean)
      .join(" · "),
  catalogueSource: "Rattaché au titre du Catalogue, même fichier",
  lineage: "Filiation",
  lineageSource: (file: string) => `Source confirmée : ${file}`,
  lineageMix: (n: number, file: string) => `Mix final V${n} : ${file}`,
  lineageMaster: (n: number, file: string) => `Master final V${n} : ${file}`,
  unlocks: "Ce que ça débloque",
  unlocksDistribution: "Distribution · prérequis « Master final » : fait",
  unlocksLegal: (s: number | null) =>
    s
      ? `Juridique · durée du bulletin SACEM : ${duration(s)}`
      : "Juridique · durée du bulletin SACEM : à lire sur le fichier",
  unlocksSource: "Lus directement sur ce master final, sans import",
  toDistribution: "Aller à la Distribution",
  deliverables: "Autres livrables attendus",
  expected: "Attendu",
  expectedSource: "Demandé dans le Brief",
  received: "Reçu",
  receivedSource: (by: string | null) =>
    by ? `Noté reçu par ${by}` : "Noté reçu",
  markReceived: "Noter comme reçu",
  waiting: "Le master final arrive avec la validation du Mastering.",
  // Deposited by the engineer on their link (proto « Autres livrables »).
  receivedVia: (day: string, by: string | null) =>
    `Reçu le ${day} par son lien${by ? ` · ${by}` : ""}`,
  waitingEngineer: (name: string, n: number) =>
    `En attente de ${name} (lien privé) : ${n > 1 ? `déposer ${n} livrables` : "déposer le livrable"}.`,
  link: {
    title: "Autres livrables",
    states: { todo: "À vous", done: "Reçus" },
    todo: (n: number) =>
      n > 1 ? `Déposer ${n} livrables` : "Déposer le livrable",
    sent: (day: string) => `Envoyé le ${day}`,
    hint: "WAV, AIFF, FLAC, MP3, M4A, AAC ou OGG.",
    stemsHint: "Un ZIP des pistes, ou WAV, AIFF, FLAC.",
    confirm: "C'est exactement ce fichier qui partira chez le label.",
    notAccepted: "Ce format n'est pas accepté pour ce livrable.",
  },
  done: "Master final au Catalogue, livrables reçus. Le paiement reste à suivre : il ne bloque rien.",
  missing: (n: number) =>
    n > 1 ? `En attente de ${n} livrables.` : "En attente d'un livrable.",
} as const;
