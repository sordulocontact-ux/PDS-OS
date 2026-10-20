// The creative director's answer read by PO, with its quotes (proto
// `daQuestion`, docs/projet-complet/master.md § 2, VISION-UX rule 12).

export const masterAnswer = {
  intro:
    "Le Brief ne la connaît pas : c'est à la directrice créative d'en décider. Votre réponse ira dans le dossier de l'ingénieur.",
  label: "Votre réponse",
  placeholder:
    "Ce que vous voulez entendre, vos références, ce qu'il ne faut pas faire…",
  read: "Lire ma réponse",
  reading: "PO lit votre réponse…",
  understood: "Ce que PO a compris",
  understoodHint:
    "Retirez ce qui est faux, puis envoyez. Rien n'est gardé avant.",
  groups: {
    direction: "Direction",
    references: "Références",
    constraints: "Contraintes",
  },
  remove: "Retirer",
  removeLabel: (label: string) => `Retirer « ${label} »`,
  send: "Envoyer la réponse",
  back: "Modifier ma réponse",
  nothing:
    "PO n'a rien trouvé à reprendre mot pour mot : votre réponse partira telle quelle.",
  readFailed: "PO n'a pas pu lire votre réponse. Réessayez, ou modifiez-la.",
  notVerbatim:
    "Un élément ne se retrouve plus mot pour mot dans votre réponse : relisez-la avec PO.",
  answered: (name: string, day: string) =>
    `${name} a répondu le ${day}. Rien n'entre dans le Brief avant que vous l'ajoutiez.`,
  source: (name: string, day: string) =>
    `Réponse de ${name}, le ${day} · chaque élément est repris mot pour mot`,
} as const;
