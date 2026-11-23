// A delay the engineer signals, decided by the owner or the direction
// (proto `master:thread`, docs/projet-complet/master.md § 6).

const first = (name: string) => name.split(" ")[0] ?? name;

export const masterDelay = {
  statuses: {
    open: "À traiter",
    escalated: "Chez la direction",
    handled: "Traité",
  },
  replyTo: (name: string) => `Réponse à ${first(name)}`,
  replyPlaceholder: "Pas de souci, on décale.",
  replyPlaceholderDirection:
    "Impossible de décaler : la sortie est calée avec la radio.",
  keepWhy: (name: string) =>
    `Dites pourquoi à ${first(name)} : il le lira sur son lien.`,
  apply: "Appliquer ces dates",
  applyDirection: "Appliquer ces dates (la sortie est à revoir)",
  applied: "Nouvelles dates appliquées",
  escalate: "Envoyer à la direction",
  escalated: "Envoyé à la direction",
  keep: "Garder les dates",
  refuse: "Refuser le retard",
  answered: "Réponse envoyée",
  beyond: (day: string, release: string) =>
    `Le master final passerait le ${day}, après la sortie du ${release} : c'est à la direction d'arbitrer.`,
  atDirection: (who: string) =>
    `Chez la direction : ${who} décide, puis l'ingénieur lit la réponse sur son lien.`,
  proposed: (days: string) => `Proposé : décalé de ${days}`,
  outcomes: {
    applied: (days: string, by: string | null) =>
      `Dates décalées de ${days}${by ? `, appliquées par ${by}` : ""}`,
    kept: (by: string | null) => `Dates gardées${by ? ` par ${by}` : ""}`,
    refused: (by: string | null) => `Retard refusé${by ? ` par ${by}` : ""}`,
  },
  errors: {
    forbidden: "Ce retard ne vous attend plus : la page va se recharger.",
    replyRequired: "Écrivez votre réponse : l'ingénieur la lit sur son lien.",
    order:
      "Ces dates ne respectent plus l'ordre du Brief : changez-les dans le Brief.",
  },
} as const;
